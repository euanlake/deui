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
import { MutableRefObject, useEffect, useMemo, useRef, useCallback } from 'react'
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
import { ScaleApi } from '../api/interfaces/ScaleApi'
import { WebSocketApi } from '../api/interfaces/WebSocketApi'

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
    
    // New function to load profiles from files
    loadProfilesFromFiles: () => void;

    // Scale functionality
    getScales: () => Promise<Scale[]>
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

// Initialize properties with default values for scale-related properties
const initialProperties: Properties = {
    [Prop.Weight]: 0,
    [Prop.RecentEspressoMaxWeight]: 0,
    [Prop.RecentEspressoMaxFlow]: 0,
    [Prop.RecentEspressoMaxPressure]: 0,
    [Prop.RecentEspressoTime]: 0,
    // Add other default properties here...
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
            ...shotSettingsToProperties(shotSettings),
            ...scaleSnapshotToProperties(scaleSnapshot),
            ...machineStateToProperties(machineState),
            ...waterLevelsToProperties(waterLevels)
        };
        
        // Ensure we have a timestamp for UI updates
        if (!newProperties[Prop.ShotSampleTime]) {
            newProperties[Prop.ShotSampleTime] = Date.now();
        }
        
        // Extract major and minor state to pass to setMachineStateProperties
        const majorState = newProperties[Prop.MajorState] as MajorState || MajorState.Sleep;
        const minorState = newProperties[Prop.MinorState] as MinorState || MinorState.NoState;
        
        // Update properties immediately
        if (Object.keys(newProperties).length > 0) {
            setProperties(newProperties as Properties);
            
            // Explicitly call setMachineStateProperties to ensure timer state is updated
            // This is critical for the shot timer functionality
            setMachineStateProperties(majorState, minorState);
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
                            [Prop.RecentEspressoTime]: 0,
                        })
                    }

                    // Define the active espresso substates where metrics should be tracked/displayed
                    const activeEspressoSubstates = [MinorState.PreInfuse, MinorState.Pour];

                    const isMaxTrackingState = majorState === MajorState.Espresso && 
                                             typeof minorState !== 'undefined' &&
                                             activeEspressoSubstates.includes(minorState);

                    if (!isMaxTrackingState) {
                        /**
                         * We only collect recent extremes for Espresso during active pour/preinfuse.
                         * Ignore everything else.
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
                        [Prop.MajorState]: majorState,
                    } = next.properties

                    // Define the active espresso substates where metrics should be tracked/displayed
                    const activeEspressoSubstates = [MinorState.PreInfuse, MinorState.Pour];
                    const isDisplayState = majorState === MajorState.Espresso && 
                                           typeof minorState !== 'undefined' &&
                                           activeEspressoSubstates.includes(minorState);

                    if (typeof flow !== 'undefined') {
                        next.properties[Prop.Flow] = isDisplayState ? flow : 0
                    }

                    if (typeof pressure !== 'undefined') {
                        next.properties[Prop.Pressure] = isDisplayState ? pressure : 0
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
        // Determine if this is an active espresso state that should trigger the timer
        const isActiveEspressoState = majorState === MajorState.Espresso && 
            (minorState === MinorState.Pour || minorState === MinorState.PreInfuse);
            
        // Get the appropriate timer property for this machine state
        const timedProp = isActiveEspressoState ? 
            majorToTimedPropMap[majorState] : void 0;
            
        const npnflushTimedProp =
            minorState !== MinorState.Flush ? majorToTimedPropMap[majorState] : void 0;

        if (!timedProp) {
            // If we're stopping an espresso timer, save the final shot time
            if (recentTimer && majorState === MajorState.Espresso && 
                get().properties[Prop.EspressoTime] > 0) {
                // Save the final shot time to be displayed after the shot ends
                setProperties({ 
                    [Prop.RecentEspressoTime]: get().properties[Prop.EspressoTime] 
                });
            }
            
            recentTimer?.stop();
            recentTimer = undefined;
            
            if (npnflushTimedProp) {
                setProperties({ [npnflushTimedProp]: 0 });
            }
            
            return;
        }

        const timer = timers[timedProp] || (timers[timedProp] = stopwatch())

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
                setProperties({ [timedProp]: t })
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
    
    // Scale data handling
    let selectedScale: Scale | null = null
    let scaleSnapshot: ScaleSnapshot | null = null

    async function handleScaleData(scaleApi: ScaleApi, webSocketApi: WebSocketApi) {
        try {
            // Get the initial scale if available
            selectedScale = await scaleApi.getSelectedScale()
            set({ selectedScale })

            // Setup scale snapshot subscription
            const wsConnection = webSocketApi.connectToScaleSnapshot()
            
            wsConnection.onMessage((data) => {
                const snapshot = data as ScaleSnapshot
                scaleSnapshot = snapshot
                
                // Update weight property
                set(state => ({
                    properties: {
                        ...state.properties,
                        [Prop.Weight]: snapshot.weight
                    }
                }))
                
                // When a shot completes, capture the final weight as max weight
                const properties = get().properties;
                const minorState = properties[Prop.MinorState] as MinorState;
                if (minorState !== MinorState.Pour && minorState !== MinorState.PreInfuse) {
                    set(state => ({
                        properties: {
                            ...state.properties,
                            [Prop.RecentEspressoMaxWeight]: snapshot.weight
                        }
                    }))
                }
            })
        } catch (error) {
            console.error('Failed to set up scale data handling:', error)
        }
    }

    // Initialize properties
    set({ properties: initialProperties })

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

        // Replace the old fetchProfiles with loadProfilesFromFiles
        async loadProfilesFromFiles() {
            try {
                console.log('Starting to load profiles from files');
                // Use the fetch API to get a list of all profiles from the public/profiles folder
                const profileFileList = await fetch('/profiles-list.json')
                    .then(response => {
                        console.log('Profiles list response:', response.status, response.statusText);
                        if (!response.ok) {
                            console.log('Falling back to directory listing');
                            // If profiles-list.json doesn't exist, get the list directly
                            return fetch('/profiles/')
                                .then(res => {
                                    console.log('Directory listing response:', res.status, res.statusText);
                                    return res.text();
                                })
                                .then(html => {
                                    // Extract filenames from directory listing
                                    const regex = /href="([^"]+\.json)"/g;
                                    const matches = [...html.matchAll(regex)];
                                    const filenames = matches.map(match => match[1]);
                                    console.log('Extracted filenames from directory listing:', filenames.length, filenames.slice(0, 5));
                                    return filenames;
                                });
                        }
                        return response.json();
                    });

                console.log('Profile file list obtained:', Array.isArray(profileFileList), profileFileList ? profileFileList.length : 0);
                
                // Fetch each profile file and parse it
                const profiles = await Promise.all(
                    (Array.isArray(profileFileList) ? profileFileList : [])
                        .map(async (filename) => {
                            try {
                                console.log(`Loading profile: ${filename}`);
                                const profileData = await fetch(`/profiles/${filename}`)
                                    .then(res => {
                                        if (!res.ok) {
                                            console.error(`Failed to fetch profile ${filename}:`, res.status, res.statusText);
                                            return null;
                                        }
                                        return res.json();
                                    });
                                
                                if (!profileData) return null;
                                
                                // Extract the ID from the filename (without .json)
                                const id = filename.replace('.json', '');
                                
                                return {
                                    id,
                                    title: profileData.title || id,
                                    ...profileData
                                };
                            } catch (error) {
                                console.error(`Error loading profile ${filename}:`, error);
                                return null;
                            }
                        })
                );

                // Filter out any failed loads and update the store
                const validProfiles = profiles.filter(p => p !== null);
                
                console.log(`Successfully loaded ${validProfiles.length} profiles`, validProfiles.map(p => p.id).slice(0, 5));
                
                set({ profiles: validProfiles });
                
                // After profiles are loaded, check if we have a saved profile in localStorage
                try {
                    const { StorageKey } = await import('$/shared/types');
                    const savedProfileId = localStorage.getItem(StorageKey.LastUsedProfile);
                    
                    if (savedProfileId) {
                        console.log(`Found saved profile ID: ${savedProfileId}, restoring it`);
                        
                        // Check if the saved profile exists in the loaded profiles
                        const profileExists = validProfiles.some(p => p.id === savedProfileId);
                        
                        if (profileExists) {
                            // Update the profileId in the remoteState
                            set(state => ({
                                remoteState: {
                                    ...state.remoteState,
                                    profileId: savedProfileId
                                }
                            }));
                            console.log(`Successfully restored profile ${savedProfileId} from previous session`);
                        } else {
                            console.warn(`Saved profile ${savedProfileId} not found in loaded profiles`);
                        }
                    }
                } catch (e) {
                    console.error('Error restoring saved profile:', e);
                }
            } catch (error) {
                console.error('Error loading profiles from files:', error);
            }
        },

        // Keep the old fetchProfiles for compatibility, but make it call loadProfilesFromFiles
        fetchProfiles() {
            get().loadProfilesFromFiles();
        },

        // R1 API State
        apiProvider: null,
        connectionStatus: 'disconnected',
        connectionError: null,
        devices: [],
        machineState: null,
        selectedScale,
        scaleSnapshot,
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
                } catch (healthCheckError: unknown) {
                    const errorMessage = healthCheckError instanceof Error ? 
                        healthCheckError.message : 
                        'Unknown error connecting to R1 server';
                    throw new Error(`R1 server unreachable: ${errorMessage}`);
                }

                // Fetch initial data
                await get().fetchDevices();
                await get().fetchMachineState();
                
                // Setup WebSocket connections with proper error handling and reconnection
                const setupWebsocket = (
                    connectionMethod: () => WebSocketConnection,
                    connectionName: string,
                    onData: (data: any) => void
                ) => {
                    console.log(`Setting up ${connectionName} WebSocket connection`);
                    const connection = connectionMethod();
                    
                    connection.onMessage((data) => {
                        // Force UI update with new reference by creating shallow copy
                        const newData = {...data};
                        
                        // Call the handler to update state
                        onData(newData);
                        
                        // Trigger legacy state sync immediately after data update
                        // This ensures UI components re-render with new data
                        setTimeout(() => {
                            const stateStore = get();
                            stateStore.syncR1StateToLegacyState();
                        }, 0);
                    });
                    
                    connection.onError((error) => {
                        console.error(`WebSocket error (${connectionName}):`, error);
                        
                        // Log error but don't change connection status as other connections may be working
                        set(state => ({
                            ...state,
                            r1LastConnectionError: `${connectionName} error: ${error.message}`
                        }));
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
                    (data) => {
                        set({ machineState: data });
                    }
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
                console.log('Scanning for devices...')
                
                // Trigger the device scan endpoint directly
                try {
                    // First try the device adapter's method
                    await apiProvider.device.scanForDevices()
                } catch (err) {
                    console.warn('Device adapter scan failed, using direct API call:', err)
                    // Fall back to direct API call
                    await axios.get(`${apiProvider.baseUrl || ''}/api/v1/devices/scan`, {
                        timeout: 10000 // 10 second timeout
                    })
                }
                
                // Wait a bit for the scan to complete (scanning can take time)
                console.log('Waiting for scan to complete...')
                await new Promise(resolve => setTimeout(resolve, 3000))
                
                // Fetch updated device list
                console.log('Fetching updated device list...')
                await get().fetchDevices()
                
                console.log('Device scan completed')
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
                if (!apiProvider.machine) return;
                // Convert version to string if needed
                const fixedProfile = {
                    ...profile,
                    version: String(profile.version)
                };
                await apiProvider.machine.uploadProfile(fixedProfile);
                // Refresh the profile list
                get().fetchProfiles(apiProvider.machine as any);
            } catch (error) {
                console.error('Failed to upload profile:', error);
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
        async selectScale(scaleId: string) {
            const { apiProvider } = get();
            if (!apiProvider) {
                throw new Error('API Provider not available');
            }
            
            console.log(`Attempting to select scale with ID: ${scaleId}`);
            await apiProvider.scale.selectScale(scaleId);
            
            // Update the selected scale in the store
            console.log('Fetching updated selected scale...');
            const updatedScale = await apiProvider.scale.getSelectedScale();
            console.log('Updated selected scale state:', updatedScale);
            set({ selectedScale: updatedScale });
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
            port: 8080,
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

        // Scale functionality
        getScales: async function() {
            const { apiProvider } = get();
            if (!apiProvider) {
                console.warn('getScales called before apiProvider is initialized');
                return [];
            }
            
            try {
                console.log('DataStore: Calling apiProvider.scale.getScales');
                // First try the adapter's getScales method directly
                const scales = await apiProvider.scale.getScales();
                console.log('DataStore: Received scales from adapter:', scales);
                return scales;
            } catch (error) {
                console.error('DataStore: Failed to get scales via apiProvider:', error);
                return [];
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

export function useScaleStatus() {
    const { selectedScale, isUsingR1Api } = useDataStore()
    
    // If there's no scale selected, return off status
    if (!selectedScale) {
        return Status.Off
    }
    
    // If there is a scale and it's connected, return on status
    if (selectedScale.connectionState === 'connected') {
        return Status.On
    }
    
    // If there is a scale but it's disconnected, return busy status
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
        disconnect, connectToApi, 
        r1ConnectionSettings, connectionStatus,
        fetchMachineState, isUsingR1Api
    } = useDataStore();
    const { machineMode, setMachineMode } = useUiStore();
    const machineModeRef = useRef(machineMode);
    const isR1Available = useR1Availability();
    
    // Track previous connection status to detect actual connection events
    const prevConnectionStatusRef = useRef(connectionStatus);

    if (machineModeRef.current !== machineMode) {
        machineModeRef.current = machineMode;
    }

    const timeoutIdRef = useRef<number | undefined>(undefined);
    useEffect(() => void clearReffedTimeoutId(timeoutIdRef), [machineMode]);
    
    // Get R1 server URL with appropriate protocol
    const r1Url = useServerUrl({ 
        protocol: r1ConnectionSettings.useSecureProtocol ? 'https' : 'http'
    });

    // Function to switch to Espresso tab after connection
    const switchToEspressoTab = useCallback(() => {
        if (machineModeRef.current === ('Server' as any)) {
            console.log('Switching from Server to Espresso tab after connection established');
            clearReffedTimeoutId(timeoutIdRef);
            timeoutIdRef.current = window.setTimeout(() => {
                setMachineMode(MachineMode.Espresso);
            }, 500); // Use a shorter timeout for more responsive UI
        }
    }, [setMachineMode, timeoutIdRef, machineModeRef]);

    // Function to handle initial data fetching when connected
    const refreshDataOnConnect = useCallback(async () => {
        try {
            console.log('Connection established, fetching fresh machine data');
            
            // Fetch fresh machine state to update UI
            await fetchMachineState();
            
            // Force state synchronization
            if (isUsingR1Api()) {
                console.log('Syncing R1 state to legacy state');
                useDataStore.getState().syncR1StateToLegacyState();
            }
            
            console.log('Machine data refresh completed');
        } catch (error) {
            console.error('Error refreshing machine data:', error);
        }
    }, [fetchMachineState, isUsingR1Api]);

    // Effect to monitor connection status changes and update UI when connected
    useEffect(() => {
        // Only trigger actions when we transition from a non-connected to connected state
        if (connectionStatus === 'connected' && prevConnectionStatusRef.current !== 'connected') {
            console.log('Connection established, updating UI');
            
            // First refresh the data to ensure we have the latest values
            refreshDataOnConnect();
            
            // Then switch tabs if needed
            switchToEspressoTab();
        }
        
        // Update previous status reference
        prevConnectionStatusRef.current = connectionStatus;
    }, [connectionStatus, switchToEspressoTab, refreshDataOnConnect]);

    // Effect to handle the initial connection attempt
    useEffect(() => {
        let mounted = true;

        void (async () => {
            if (!mounted || !isR1Available) return;

            try {
                // Connect using R1 API
                await connectToApi(r1Url);
                
                // Note: We don't need to manually switch the tab here anymore
                // The connection status change effect will handle it
            } catch (e) {
                console.warn('R1 API connection failed', e);
            }
        })();

        // Clean up on unmount
        return () => {
            mounted = false;
            disconnect();
        };
    }, [
        disconnect, connectToApi, 
        r1Url, isR1Available
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
