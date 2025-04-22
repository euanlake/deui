import { Status } from '$/components/StatusIndicator'
import {
    BluetoothState,
    CharAddr,
    ConnectionPhase,
    MachineMode,
    MajorState,
    MinorState,
    isCharMessage,
    ChunkType,
    Profile,
    Prop,
    Properties,
    RemoteState,
    WebSocketState,
    isStateMessage,
} from '$/shared/types'
import wsStream, { WsController } from '$/utils/wsStream'
import { produce } from 'immer'
import { MutableRefObject, useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import { Buffer } from 'buffer'
import { decodeShotFrame, decodeShotHeader } from '$/utils/shot'
import getDefaultRemoteState from '$/utils/getDefaultRemoteState'
import stopwatch from '$/utils/stopwatch'
import avg from '$/utils/avg'
import { useUiStore } from './ui'
import { sleep } from '$/shared/utils'
import axios from 'axios'
import { z } from 'zod'
import { useServerUrl, useShouldUseR1Api, useR1Availability } from '$/hooks'
import { ApiProvider } from '../api/interfaces/ApiProvider'
import { R1ApiProvider } from '../api/adapters/r1/R1ApiProvider'
import { MockApiProvider } from '../api/adapters/mock/MockApiProvider'
import { Device } from '../api/models/Device'
import { MachineState, MachineStateType, ShotSettings } from '../api/models/Machine'
import { Scale, ScaleSnapshot } from '../api/models/Scale'
import { WebSocketConnection } from '../api/interfaces/WebSocketConnection'
import {
    machineStateToProperties,
    scaleSnapshotToProperties,
    shotSettingsToProperties,
    waterLevelsToProperties,
    connectionStatusToRemoteState
} from '../api/transformers/stateTransformers'

interface DataStore {
    // Legacy state
    wsState: WebSocketState
    remoteState: RemoteState
    properties: Properties
    connect: (url: string, options?: { onDeviceReady?: () => void }) => Promise<void>
    disconnect: () => void
    profiles: Profile[]
    fetchProfiles: (url: string) => void
    
    // New R1 API state
    apiProvider: ApiProvider | null
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
    connectionError: string | null
    devices: Device[]
    machineState: MachineState | null
    selectedScale: Scale | null
    scaleSnapshot: ScaleSnapshot | null
    shotSettings: ShotSettings | null
    waterLevels: { currentPercentage: number; warningThresholdPercentage: number } | null
    
    // WebSocket connections
    machineSnapshotConnection: WebSocketConnection | null
    scaleSnapshotConnection: WebSocketConnection | null
    shotSettingsConnection: WebSocketConnection | null
    waterLevelsConnection: WebSocketConnection | null
    
    // R1 API methods
    connectToApi: (url: string) => Promise<void>
    reconnect: () => Promise<void>
    fetchDevices: () => Promise<void>
    scanForDevices: () => Promise<void>
    fetchMachineState: () => Promise<void>
    setMachineState: (newState: MachineStateType) => Promise<void>
    uploadProfile: (profile: Profile) => Promise<void>
    updateShotSettings: (settings: ShotSettings) => Promise<void>
    setUsbCharging: (enabled: boolean) => Promise<void>
    selectScale: (scaleId: string) => Promise<void>
    tareScale: () => Promise<void>
    
    // State integration methods
    syncR1StateToLegacyState: () => void
    isUsingR1Api: () => boolean

    // Connection management
    r1ConnectionAttempts: number;
    r1LastConnectionError: string | null;
    r1AutoReconnect: boolean;
    r1ConnectionSettings: {
        hostname: string;
        port: number;
        useSecureProtocol: boolean;
    };
    updateR1ConnectionSettings: (settings: Partial<DataStore['r1ConnectionSettings']>) => void;
    pauseR1AutoReconnect: () => void;
    resumeR1AutoReconnect: () => void;
}

function getDefaultProperties(): Properties {
    return {
        [Prop.WaterCapacity]: 1500,
    }
}

type Stopwatch = ReturnType<typeof stopwatch>

type TimedProp = Prop.EspressoTime | Prop.SteamTime | Prop.WaterTime | Prop.FlushTime

const majorToTimedPropMap: Partial<Record<MajorState, TimedProp>> = {
    [MajorState.Espresso]: Prop.EspressoTime,
    [MajorState.Steam]: Prop.SteamTime,
    [MajorState.HotWater]: Prop.WaterTime,
    [MajorState.HotWaterRinse]: Prop.FlushTime,
}

export const useDataStore = create<DataStore>((set, get) => {
    let ctrl: WsController | undefined
    let lastConnectionUrl: string | null = null

    // Setup state sync middleware to update legacy state when R1 state changes
    const syncR1StateToLegacyState = () => {
        const {
            machineState,
            scaleSnapshot,
            shotSettings,
            waterLevels,
            connectionStatus
        } = get();
        
        // Create properties object from R1 state
        const newProperties = {
            ...machineStateToProperties(machineState),
            ...scaleSnapshotToProperties(scaleSnapshot),
            ...shotSettingsToProperties(shotSettings),
            ...waterLevelsToProperties(waterLevels)
        };
        
        // Update properties
        if (Object.keys(newProperties).length > 0) {
            setProperties(newProperties as Properties);
        }
        
        // Update remote state based on connection status
        const newRemoteState = connectionStatusToRemoteState(connectionStatus);
        if (Object.keys(newRemoteState).length > 0) {
            setRemoteState(newRemoteState as RemoteState);
        }
    };
    
    // Determine if we're using R1 API
    const isUsingR1Api = () => {
        return get().apiProvider !== null;
    };

    function setProperties(properties: Properties) {
        set((current) =>
            produce(current, (next) => {
                Object.assign(next.properties, properties)

                /**
                 * Set recent max pressure and flow for Espresso.
                 */
                void (() => {
                    const { [Prop.MajorState]: previousMajorState } = current.properties

                    const { [Prop.MinorState]: minorState, [Prop.MajorState]: majorState } =
                        next.properties

                    if (previousMajorState !== majorState && majorState === MajorState.Espresso) {
                        /**
                         * Going from any state to `Espresso` resets the recent max flow & pressure.
                         */

                        Object.assign(next.properties, {
                            [Prop.RecentEspressoMaxFlow]: 0,
                            [Prop.RecentEspressoMaxPressure]: 0,
                        })
                    }

                    if (majorState !== MajorState.Espresso || minorState !== MinorState.Pour) {
                        /**
                         * We only collect recent extremes for Espresso+Pour. Ignore
                         * everything else.
                         */
                        return
                    }

                    const {
                        [Prop.RecentEspressoMaxFlow]: recentMaxFlow = 0,
                        [Prop.RecentEspressoMaxPressure]: recentMaxPressure = 0,
                    } = next.properties

                    const { [Prop.ShotGroupPressure]: pressure, [Prop.ShotGroupFlow]: flow } =
                        properties

                    if (typeof flow !== 'undefined' && recentMaxFlow < flow) {
                        next.properties[Prop.RecentEspressoMaxFlow] = flow
                    }

                    if (typeof pressure !== 'undefined' && recentMaxPressure < pressure) {
                        next.properties[Prop.RecentEspressoMaxPressure] = pressure
                    }
                })()

                /**
                 * Set (or reset) displayed flow and displayed pressure props.
                 */
                void (() => {
                    const {
                        [Prop.ShotGroupPressure]: pressure,
                        [Prop.ShotGroupFlow]: flow,
                        [Prop.MinorState]: minorState,
                    } = next.properties

                    const isPour = minorState === MinorState.Pour

                    if (typeof flow !== 'undefined') {
                        next.properties[Prop.Flow] = isPour ? flow : 0
                    }

                    if (typeof pressure !== 'undefined') {
                        next.properties[Prop.Pressure] = isPour ? pressure : 0
                    }
                })()
            })
        )
    }

    function setRemoteState(
        remoteState: Partial<RemoteState>,
        { onDeviceReady }: { onDeviceReady?: () => void } = {}
    ) {
        /**
         * Readyness reporting.
         */
        void (() => {
            const { deviceReady: previousDeviceReady } = get().remoteState

            if (!previousDeviceReady && remoteState.deviceReady) {
                onDeviceReady?.()
            }
        })()

        set((current) => ({
            remoteState: {
                ...current.remoteState,
                ...remoteState
            }
        }))
    }

    const timers: Record<TimedProp, Stopwatch | undefined> = {
        [Prop.EspressoTime]: undefined,
        [Prop.SteamTime]: undefined,
        [Prop.WaterTime]: undefined,
        [Prop.FlushTime]: undefined,
    }

    let recentTimer: Stopwatch | undefined

    function engageTimerForState(majorState: MajorState, minorState: MinorState) {
        const pourTimedProp =
            minorState === MinorState.Pour ? majorToTimedPropMap[majorState] : void 0

        const npnflushTimedProp =
            minorState !== MinorState.Flush ? majorToTimedPropMap[majorState] : void 0

        if (!pourTimedProp) {
            recentTimer?.stop()

            recentTimer = undefined

            if (npnflushTimedProp) {
                setProperties({ [npnflushTimedProp]: 0 })
            }

            return
        }

        const timer = timers[pourTimedProp] || (timers[pourTimedProp] = stopwatch())

        if (timer === recentTimer) {
            /**
             * We're received a second hit for the same timer. Skip.
             */
            return
        }

        /**
         * Timers are different at this point, we know. Stop the
         * previous one and start the current one.
         */
        recentTimer?.stop()

        /**
         * And remeber the current one for the next round of states.
         */
        recentTimer = timer

        /**
         * Start the current timer and make it update associated
         * timed prop.
         */
        timer.start({
            onTick(t) {
                setProperties({ [pourTimedProp]: t })
            },
        })
    }

    function setMachineStateProperties(majorState: MajorState, minorState: MinorState) {
        engageTimerForState(majorState, minorState)

        setProperties({
            [Prop.MajorState]: majorState,
            [Prop.MinorState]: minorState,
        })
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    
    return {
        wsState: WebSocketState.Closed,
        remoteState: getDefaultRemoteState(),
        properties: getDefaultProperties(),
        syncR1StateToLegacyState,
        isUsingR1Api,

        // Legacy connection method
        async connect(url, { onDeviceReady } = {}) {
            // If R1 API is available, use it instead
            if (import.meta.env.VITE_USE_R1_API === 'true') {
                return await get().connectToApi(url);
            }
            
            // Continue with legacy connection
            ctrl?.discard()

            set({ wsState: WebSocketState.Opening })

            /**
             * Let's give the opening state at least 1s of TTL so that in case of a network
             * glitch we don't flash with a barely noticable "Opening…" in the UI.
             */
            await sleep()

            try {
                ctrl = wsStream(url)

                while (true) {
                    const chunk = await ctrl.read()

                    if (!chunk) {
                        /**
                         * This should be impossible because we break this while
                         * on `ws:close`. Either way, we can catch that outside.
                         */
                        throw new Error('Invalid chunk')
                    }

                    if (chunk.type === ChunkType.WebSocketClose) {
                        break
                    }

                    if (chunk.type === ChunkType.WebSocketOpen) {
                        set({ wsState: WebSocketState.Open })

                        continue
                    }

                    if (chunk.type === ChunkType.WebSocketError) {
                        throw chunk.payload
                    }

                    const { payload: data } = chunk

                    if (isStateMessage(data)) {
                        const remoteState = data.payload

                        setRemoteState(remoteState, {
                            onDeviceReady,
                        })

                        continue
                    }

                    if (isCharMessage(data)) {
                        Object.entries(data.payload).forEach(([uuid, payload]) => {
                            const buf = Buffer.from(payload, 'base64')

                            switch (uuid) {
                                case CharAddr.StateInfo:
                                    return void setMachineStateProperties(
                                        buf.readUint8(0),
                                        buf.readUint8(1)
                                    )
                                case CharAddr.WaterLevels:
                                    return void setProperties({
                                        [Prop.WaterLevel]: avg(buf.readUint16BE() / 0x100 / 50, 7), // 0.00-1.00 (50mm tank)
                                    })
                                case CharAddr.Temperatures:
                                    return void setProperties({
                                        [Prop.WaterHeater]: buf.readUint16BE(0) / 0x100, // 1°C every 256
                                        [Prop.SteamHeater]: buf.readUint16BE(2) / 0x100,
                                        [Prop.GroupHeater]: buf.readUint16BE(4) / 0x100,
                                        [Prop.ColdWater]: buf.readUint16BE(6) / 0x100,
                                        [Prop.TargetWaterHeater]: buf.readUint16BE(8) / 0x100,
                                        [Prop.TargetSteamHeater]: buf.readUint16BE(10) / 0x100,
                                        [Prop.TargetGroupHeater]: buf.readUint16BE(12) / 0x100,
                                        [Prop.TargetColdWater]: buf.readUint16BE(14) / 0x100,
                                    })
                                case CharAddr.ShotSample:
                                    return void setProperties({
                                        [Prop.ShotSampleTime]: buf.readUint16BE(0),
                                        [Prop.ShotGroupPressure]: buf.readUInt16BE(2) / 0x1000,
                                        [Prop.ShotGroupFlow]: buf.readUint16BE(4) / 0x1000,
                                        [Prop.ShotMixTemp]: buf.readUint16BE(6) / 0x100,
                                        [Prop.ShotHeadTemp]: (buf.readUint32BE(8) >> 8) / 0x10000,
                                        [Prop.ShotSetMixTemp]: buf.readUint16BE(11) / 0x100,
                                        [Prop.ShotSetHeadTemp]: buf.readUint16BE(13) / 0x100,
                                        [Prop.ShotSetGroupPressure]: buf.readUint8(15) / 0x10,
                                        [Prop.ShotSetGroupFlow]: buf.readUint8(16) / 0x10,
                                        [Prop.ShotFrameNumber]: buf.readUint8(17),
                                        [Prop.ShotSteamTemp]: buf.readUint8(18),
                                    })
                                case CharAddr.ShotSettings:
                                    return void setProperties({
                                        [Prop.SteamSettings]: buf.readUint8(0),
                                        [Prop.TargetSteamTemp]: buf.readUint8(1),
                                        [Prop.TargetSteamLength]: buf.readUint8(2),
                                        [Prop.TargetHotWaterTemp]: buf.readUint8(3),
                                        [Prop.TargetHotWaterVol]: buf.readUint8(4),
                                        [Prop.TargetHotWaterLength]: buf.readUint8(5),
                                        [Prop.TargetEspressoVol]: buf.readUint8(6),
                                        [Prop.TargetGroupTemp]: buf.readUint16BE(7) / 0x100,
                                    })
                                case CharAddr.HeaderWrite:
                                    return void console.log('HeaderWrite', decodeShotHeader(buf))
                                case CharAddr.FrameWrite:
                                    return void console.log('FrameWrite', decodeShotFrame(buf))
                            }
                        })

                        continue
                    }
                }
            } finally {
                set({
                    wsState: WebSocketState.Closed,
                })

                setProperties(getDefaultProperties())

                setRemoteState(getDefaultRemoteState())

                ctrl = undefined
            }
        },

        // Legacy disconnect method
        disconnect() {
            // Clear any reconnect timer
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            
            if (get().isUsingR1Api()) {
                const { 
                    apiProvider,
                    machineSnapshotConnection,
                    scaleSnapshotConnection,
                    shotSettingsConnection,
                    waterLevelsConnection 
                } = get();
                
                // Close all WebSocket connections
                machineSnapshotConnection?.close();
                scaleSnapshotConnection?.close();
                shotSettingsConnection?.close();
                waterLevelsConnection?.close();
                
                // Close all connections if using R1WebSocketAdapter
                if (apiProvider && 'closeAll' in apiProvider.websocket) {
                    (apiProvider.websocket as any).closeAll();
                }
                
                // Reset connection state
                set({
                    connectionStatus: 'disconnected',
                    connectionError: null,
                    apiProvider: null,
                    machineSnapshotConnection: null,
                    scaleSnapshotConnection: null,
                    shotSettingsConnection: null,
                    waterLevelsConnection: null,
                    // Reset legacy state for compatibility
                    wsState: WebSocketState.Closed
                });
                
                // Reset properties and remote state
                setProperties(getDefaultProperties());
                setRemoteState(getDefaultRemoteState());
            } else {
                // Legacy disconnect
                ctrl?.discard();
                ctrl = undefined;
                
                // Reset legacy state
                set({
                    wsState: WebSocketState.Closed
                });
                
                setProperties(getDefaultProperties());
                setRemoteState(getDefaultRemoteState());
            }
        },

        profiles: [],

        fetchProfiles(url) {
            void (async () => {
                try {
                    set({
                        profiles: z.array(Profile).parse((await axios.get(url)).data),
                    })
                } catch (e) {
                    console.warn('Failed to fetch or parse profiles', e)
                }
            })()
        },

        // R1 API State
        apiProvider: null,
        connectionStatus: 'disconnected',
        connectionError: null,
        devices: [],
        machineState: null,
        selectedScale: null,
        scaleSnapshot: null,
        shotSettings: null,
        waterLevels: null,
        machineSnapshotConnection: null,
        scaleSnapshotConnection: null,
        shotSettingsConnection: null,
        waterLevelsConnection: null,

        // R1 API methods
        async connectToApi(url) {
            lastConnectionUrl = url

            // Increment connection attempts
            set(state => ({ 
                r1ConnectionAttempts: state.r1ConnectionAttempts + 1,
                connectionStatus: 'connecting', 
                connectionError: null,
                wsState: WebSocketState.Opening // Update legacy state for compatibility
            }));
            
            try {
                // Create API provider with potentially updated settings
                const { hostname, port, useSecureProtocol } = get().r1ConnectionSettings;
                const protocol = useSecureProtocol ? 'https' : 'http';
                const fullUrl = `${protocol}://${hostname}:${port}`;
                
                // Use the provided URL if it exists, otherwise use the constructed one
                const apiProvider = createApiProvider(url || fullUrl);
                set({ apiProvider });

                // Test connection with a simple health check first
                try {
                    await axios.get(`${url || fullUrl}/api/v1/devices`, { 
                        timeout: 5000 
                    });
                } catch (healthCheckError) {
                    throw new Error(`R1 server unreachable: ${healthCheckError.message}`);
                }

                // Fetch initial data
                await get().fetchDevices();
                await get().fetchMachineState();
                
                // Setup WebSocket connections with proper error handling and reconnection
                const setupWebsocket = (
                    connectionMethod: () => WebSocketConnection,
                    connectionName: string,
                    stateUpdateHandler: (data: any) => void
                ): WebSocketConnection => {
                    const connection = connectionMethod();
                    
                    connection.onMessage((data) => {
                        // Reset connection attempts on successful data
                        if (get().r1ConnectionAttempts > 0) {
                            set({ r1ConnectionAttempts: 0 });
                        }
                        
                        stateUpdateHandler(data);
                        // Sync with legacy state after each update
                        get().syncR1StateToLegacyState();
                    });
                    
                    connection.onError((error) => {
                        console.error(`WebSocket error (${connectionName}):`, error);
                        set({ r1LastConnectionError: `WebSocket ${connectionName}: ${error.message}` });
                    });
                    
                    connection.onClose(() => {
                        console.log(`WebSocket closed (${connectionName})`);
                        
                        // Only try to reconnect the connection if we haven't already disconnected the whole API
                        if (get().connectionStatus === 'connected' && get().apiProvider) {
                            // Try to re-establish just this connection
                            setTimeout(() => {
                                console.log(`Attempting to reconnect ${connectionName} WebSocket...`);
                                const newConnection = connectionMethod();
                                // Update the specific connection in the store
                                set({ 
                                    [`${connectionName.replace(/\s+/g, '')}Connection`]: newConnection 
                                } as any);
                            }, 2000);
                        }
                    });
                    
                    return connection;
                };
                
                // Setup all WebSocket connections
                const machineSnapshotConnection = setupWebsocket(
                    () => apiProvider.websocket.connectToMachineSnapshot(),
                    'machineSnapshot',
                    (data) => set({ machineState: data })
                );
                
                const scaleSnapshotConnection = setupWebsocket(
                    () => apiProvider.websocket.connectToScaleSnapshot(),
                    'scaleSnapshot',
                    (data) => set({ scaleSnapshot: data })
                );
                
                const shotSettingsConnection = setupWebsocket(
                    () => apiProvider.websocket.connectToShotSettings(),
                    'shotSettings',
                    (data) => set({ shotSettings: data })
                );
                
                const waterLevelsConnection = setupWebsocket(
                    () => apiProvider.websocket.connectToWaterLevels(),
                    'waterLevels',
                    (data) => set({ waterLevels: data })
                );
                
                // Update state with connections
                set({
                    machineSnapshotConnection,
                    scaleSnapshotConnection,
                    shotSettingsConnection,
                    waterLevelsConnection,
                    connectionStatus: 'connected',
                    connectionError: null,
                    r1ConnectionAttempts: 0,
                    r1LastConnectionError: null,
                    wsState: WebSocketState.Open // Update legacy state for compatibility
                });
                
                // Update remote state for compatibility
                setRemoteState({ deviceReady: true });
                
                // Perform initial sync of R1 state to legacy state
                get().syncR1StateToLegacyState();
            } catch (error) {
                console.error('Failed to connect to API:', error);
                
                // Create a user-friendly error message
                const errorMessage = error instanceof Error 
                    ? error.message 
                    : 'Unknown connection error';
                
                // Update store with error state
                set({ 
                    connectionStatus: 'error',
                    connectionError: errorMessage,
                    r1LastConnectionError: errorMessage,
                    wsState: WebSocketState.Closed // Update legacy state for compatibility
                });
                
                // Reset remote state on error
                setRemoteState(getDefaultRemoteState());
                
                // Setup automatic reconnection if enabled
                if (get().r1AutoReconnect) {
                    // Calculate backoff time based on number of attempts
                    const backoffTime = Math.min(
                        30000, // Max 30 seconds
                        1000 * Math.pow(1.5, Math.min(10, get().r1ConnectionAttempts))
                    );
                    
                    console.log(`Will attempt to reconnect in ${backoffTime/1000} seconds...`);
                    
                    // Clear any existing timer
                    if (reconnectTimer) {
                        clearTimeout(reconnectTimer);
                    }
                    
                    // Set new reconnect timer
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        if (get().r1AutoReconnect) {
                            get().reconnect();
                        }
                    }, backoffTime);
                }
            }
        },
        
        async reconnect() {
            if (lastConnectionUrl) {
                try {
                    // If using R1 API, connect through the API
                    if (get().isUsingR1Api()) {
                        // Check if we should upgrade to secure protocol based on previous errors
                        const { r1LastConnectionError, r1ConnectionSettings } = get();
                        
                        // If we previously had certificate errors, try switching protocols
                        if (r1LastConnectionError && 
                            (r1LastConnectionError.includes('certificate') || 
                             r1LastConnectionError.includes('SSL'))) {
                            
                            // Toggle the secure protocol setting
                            get().updateR1ConnectionSettings({
                                useSecureProtocol: !r1ConnectionSettings.useSecureProtocol
                            });
                            
                            // The connection will be attempted with new settings by updateR1ConnectionSettings
                            return;
                        }
                        
                        // Construct URL using current settings
                        const { hostname, port, useSecureProtocol } = get().r1ConnectionSettings;
                        const protocol = useSecureProtocol ? 'https' : 'http';
                        const fullUrl = `${protocol}://${hostname}:${port}`;
                        
                        await get().connectToApi(fullUrl);
                    } else {
                        // Otherwise use legacy connection
                        await get().connect(lastConnectionUrl);
                    }
                } catch (error) {
                    console.error('Error during reconnect:', error);
                    // We don't need to update state here as connectToApi/connect will handle that
                }
            } else {
                console.error('Cannot reconnect - no previous connection URL');
                set({ 
                    connectionError: 'No previous connection URL available',
                    r1LastConnectionError: 'No previous connection URL available' 
                });
            }
        },
        
        // R1 API Device methods
        async fetchDevices() {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                const devices = await apiProvider.device.getDevices()
                set({ devices })
            } catch (error) {
                console.error('Error fetching devices:', error)
            }
        },
        
        async scanForDevices() {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.device.scanForDevices()
                await get().fetchDevices()
            } catch (error) {
                console.error('Error scanning for devices:', error)
            }
        },
        
        // R1 API Machine methods
        async fetchMachineState() {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                const machineState = await apiProvider.machine.getState()
                set({ machineState })
                
                // Sync with legacy state after update
                get().syncR1StateToLegacyState()
            } catch (error) {
                console.error('Error fetching machine state:', error)
            }
        },
        
        async setMachineState(state) {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.machine.setState(state)
                await get().fetchMachineState()
            } catch (error) {
                console.error('Error setting machine state:', error)
            }
        },
        
        async uploadProfile(profile) {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.machine.uploadProfile(profile)
            } catch (error) {
                console.error('Error uploading profile:', error)
            }
        },
        
        async updateShotSettings(settings) {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.machine.updateShotSettings(settings)
            } catch (error) {
                console.error('Error updating shot settings:', error)
            }
        },
        
        async setUsbCharging(enabled) {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.machine.setUsbCharging(enabled)
            } catch (error) {
                console.error('Error setting USB charging:', error)
            }
        },
        
        // R1 API Scale methods
        async selectScale(scaleId) {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.scale.selectScale(scaleId)
                const selectedScale = await apiProvider.scale.getSelectedScale()
                set({ selectedScale })
            } catch (error) {
                console.error('Error selecting scale:', error)
            }
        },
        
        async tareScale() {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                await apiProvider.scale.tare()
            } catch (error) {
                console.error('Error taring scale:', error)
            }
        },

        // R1 connection monitoring
        r1ConnectionAttempts: 0,
        r1LastConnectionError: null,
        r1AutoReconnect: true,
        r1ConnectionSettings: {
            hostname: 'localhost',
            port: 8443,
            useSecureProtocol: false
        },
        
        // New methods for connection management
        updateR1ConnectionSettings(settings) {
            set(state => ({
                r1ConnectionSettings: {
                    ...state.r1ConnectionSettings,
                    ...settings
                }
            }));
            
            // Force reconnect with new settings if we're already connected
            if (get().connectionStatus === 'connected' || get().connectionStatus === 'connecting') {
                get().disconnect();
                // Give a small delay before reconnecting
                setTimeout(() => {
                    if (get().r1AutoReconnect) {
                        get().reconnect();
                    }
                }, 500);
            }
        },
        
        pauseR1AutoReconnect() {
            set({ r1AutoReconnect: false });
            
            // Clear any pending reconnect timer
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        },
        
        resumeR1AutoReconnect() {
            set({ r1AutoReconnect: true });
            
            // If we're disconnected, try to reconnect immediately
            if (get().connectionStatus === 'disconnected' || get().connectionStatus === 'error') {
                get().reconnect();
            }
        },
    }
})

// Legacy hooks that work with both legacy and R1 state
export function useIsOn() {
    const { [Prop.MajorState]: majorState = 0 } = useDataStore().properties
    return majorState !== 0
}

export function useStatus() {
    const { wsState, remoteState, connectionStatus } = useDataStore()
    
    // First check if we're using R1 API
    if (useDataStore().isUsingR1Api()) {
        if (connectionStatus === 'connected') {
            return Status.On
        } else if (connectionStatus === 'connecting') {
            return Status.Busy
        }
        return Status.Off
    }
    
    // Legacy status logic
    if (wsState === WebSocketState.Closed) {
        return Status.Off
    }

    if (remoteState.deviceReady) {
        return Status.On
    }

    return Status.Busy
}

function clearReffedTimeoutId(ref: MutableRefObject<number | undefined>) {
    if (ref.current) {
        clearTimeout(ref.current)
        ref.current = undefined
    }
}

export function useAutoConnectEffect() {
    const { 
        connect, disconnect, isUsingR1Api, connectToApi, 
        r1ConnectionSettings, updateR1ConnectionSettings
    } = useDataStore();
    const { machineMode, setMachineMode } = useUiStore();
    const machineModeRef = useRef(machineMode);
    const shouldUseR1Api = useShouldUseR1Api();
    const isR1Available = useR1Availability();

    if (machineModeRef.current !== machineMode) {
        machineModeRef.current = machineMode;
    }

    const timeoutIdRef = useRef<number | undefined>(undefined);
    useEffect(() => void clearReffedTimeoutId(timeoutIdRef), [machineMode]);
    
    // Get server URL with appropriate protocol
    const legacyUrl = useServerUrl({ protocol: 'ws' });
    const r1Url = useServerUrl({ 
        protocol: r1ConnectionSettings.useSecureProtocol ? 'https' : 'http'
    });

    useEffect(() => {
        let mounted = true;

        void (async () => {
            let attempts = 0;
            let reachedReadyness = false;

            // Make a single connection attempt
            const attemptConnection = async () => {
                if (!mounted) return;

                try {
                    // Use R1 API if available and enabled
                    if (shouldUseR1Api && isR1Available) {
                        await connectToApi(r1Url);
                    } else {
                        // Use legacy connection method
                        await connect(legacyUrl, {
                            onDeviceReady() {
                                reachedReadyness = true;
                                clearReffedTimeoutId(timeoutIdRef);

                                timeoutIdRef.current = window.setTimeout(() => {
                                    if (mounted && machineModeRef.current === ('Server' as any)) {
                                        setMachineMode(MachineMode.Espresso);
                                    }
                                }, 2000);
                            }
                        });
                    }

                    attempts = 0;
                } catch (e) {
                    console.warn('Connect failed', e);
                    attempts = Math.min(40, attempts + 1);
                } finally {
                    if (reachedReadyness) {
                        setMachineMode('Server' as any);
                    }

                    reachedReadyness = false;
                    clearReffedTimeoutId(timeoutIdRef);
                }
            };

            // Make initial connection attempt
            await attemptConnection();
            
            // If using legacy connection, continue with the reconnection loop
            if (!shouldUseR1Api) {
                while (mounted) {
                    await sleep(attempts * 250);
                    await attemptConnection();
                }
            }
        })();

        // Clean up on unmount
        return () => {
            mounted = false;
            disconnect();
        };
    }, [
        disconnect, connect, connectToApi, setMachineMode, 
        legacyUrl, r1Url, shouldUseR1Api, isR1Available
    ]);
}

// These hooks work the same for both legacy and R1 state
export function usePropValue(prop: Prop) {
    return useDataStore().properties[prop]
}

export function useMajorState() {
    return usePropValue(Prop.MajorState)
}

export function useMinorState() {
    return usePropValue(Prop.MinorState)
}

export function useWaterLevel() {
    return usePropValue(Prop.WaterLevel)
}

export function usePhase() {
    switch (useConnectionPhase()) {
        case ConnectionPhase.BluetoothOff:
            return 'Bluetooth is off'
        case ConnectionPhase.ConnectingAdapters:
            return 'Connecting to DE1…'
        case ConnectionPhase.NoBluetooth:
            return 'Bluetooth is unavailable'
        case ConnectionPhase.Opening:
            return 'Opening…'
        case ConnectionPhase.Scanning:
            return 'Looking for DE1…'
        case ConnectionPhase.SettingUp:
            return 'Setting up…'
        case ConnectionPhase.WaitingToReconnect:
            return 'Reconnecting shortly…'
        case ConnectionPhase.Irrelevant:
        default:
    }
}

export function useConnectionPhase() {
    const { wsState, remoteState, connectionStatus, isUsingR1Api } = useDataStore()
    const status = useStatus()
    
    // R1 API connection phase
    if (isUsingR1Api()) {
        if (connectionStatus === 'connecting') {
            return ConnectionPhase.ConnectingAdapters
        }
        
        if (connectionStatus === 'error') {
            return ConnectionPhase.WaitingToReconnect
        }
        
        if (connectionStatus === 'disconnected') {
            return ConnectionPhase.Irrelevant
        }
        
        return ConnectionPhase.Irrelevant
    }
    
    // Legacy connection phase
    if (wsState === WebSocketState.Closed) {
        return ConnectionPhase.WaitingToReconnect
    }

    if (status !== Status.Busy) {
        return ConnectionPhase.Irrelevant
    }

    if (wsState === WebSocketState.Opening) {
        return ConnectionPhase.Opening
    }

    if (remoteState.scanning) {
        return ConnectionPhase.Scanning
    }

    if (remoteState.connecting) {
        return ConnectionPhase.ConnectingAdapters
    }

    if (remoteState.discoveringCharacteristics) {
        return ConnectionPhase.SettingUp
    }

    if (remoteState.bluetoothState === BluetoothState.PoweredOff) {
        return ConnectionPhase.BluetoothOff
    }

    if (remoteState.bluetoothState !== BluetoothState.PoweredOn) {
        return ConnectionPhase.NoBluetooth
    }
}

export function useCurrentProfileLabel() {
    const {
        profiles,
        remoteState: { profileId },
    } = useDataStore()

    return useMemo(() => profiles.find(({ id }) => id === profileId)?.title, [profiles, profileId])
}

// Helper to create the appropriate API provider
function createApiProvider(url: string): ApiProvider {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_MOCK_API === 'true') {
        return new MockApiProvider()
    }
    
    return new R1ApiProvider(url)
}

// New R1-specific hooks for direct access to R1 state
export function useMachineState() {
    return useDataStore(state => state.machineState)
}

export function useScaleSnapshot() {
    return useDataStore(state => state.scaleSnapshot)
}

export function useDevices() {
    return useDataStore(state => state.devices)
}

export function useSelectedScale() {
    return useDataStore(state => state.selectedScale)
}

export function useConnectionStatus() {
    return useDataStore(state => ({ 
        status: state.connectionStatus, 
        error: state.connectionError 
    }))
}

// Add new R1 connection management hooks
export function useR1ConnectionStatus() {
    return useDataStore(state => ({
        status: state.connectionStatus,
        error: state.connectionError,
        attempts: state.r1ConnectionAttempts,
        lastError: state.r1LastConnectionError,
        isAutoReconnect: state.r1AutoReconnect
    }));
}

export function useR1ConnectionSettings() {
    const { r1ConnectionSettings, updateR1ConnectionSettings } = useDataStore();
    return { settings: r1ConnectionSettings, updateSettings: updateR1ConnectionSettings };
}

export function useR1ConnectionControls() {
    const { pauseR1AutoReconnect, resumeR1AutoReconnect, reconnect, disconnect } = useDataStore();
    return { 
        pauseAutoReconnect: pauseR1AutoReconnect,
        resumeAutoReconnect: resumeR1AutoReconnect,
        reconnect,
        disconnect
    };
}
