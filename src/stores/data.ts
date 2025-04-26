import { Status } from '$/components/StatusIndicator'
import {
    BluetoothState,
    CharAddr,
    ConnectionPhase,
    MachineMode,
    BeverageType,
    StorageKey,
    Prop
} from '$/shared/types'
import { produce } from 'immer'
import { MutableRefObject, useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { create } from 'zustand'
import { Buffer } from 'buffer'
import { decodeShotFrame, decodeShotHeader } from '$/utils/shot'
import stopwatch from '$/utils/stopwatch'
import avg from '$/utils/avg'
import { useUiStore } from './ui'
import { sleep } from '$/shared/utils'
import axios from 'axios'
import { z } from 'zod'
import { ApiProvider } from '../api/interfaces/ApiProvider'
import { R1ApiProvider } from '../api/adapters/r1/R1ApiProvider'
import { MockApiProvider } from '../api/adapters/mock/MockApiProvider'
import { ScaleApi } from '../api/interfaces/ScaleApi'
import { WebSocketApi } from '../api/interfaces/WebSocketApi'
import { WebSocketConnection } from '../api/interfaces/WebSocketConnection'
import { 
    Device, 
    MachineState, 
    MachineStateType, 
    Profile, 
    Scale, 
    ScaleSnapshot, 
    ShotSettings,
    WaterLevels,
    ConnectionStatus,
    isMachineOn,
    getMajorState,
    getMinorState
} from '../shared/r1models'

// Timer related state
let shotTimerInterval: ReturnType<typeof setInterval> | null = null;
let shotStartTime: number | null = null;
let shotElapsedTime = 0;

// Water level filtering state
const WATER_LEVEL_UPDATE_INTERVAL = 10000; // Update every 10 seconds
const WATER_LEVEL_HISTORY_DURATION = 30000; // Keep 30 seconds of history
let waterLevelHistory: {timestamp: number, level: number}[] = [];
let lastWaterLevelUpdateTime = 0;
let filteredWaterLevel = 0;

// Type augmentation to allow 'tea_portafilter'
type ExtendedProfile = Omit<Profile, 'beverage_type'> & {
    beverage_type: string | BeverageType; // Allow any string for compatibility with legacy profiles
};

interface DataStore {
    disconnect: () => void
    profiles: Profile[]
    fetchProfiles: (url: string) => void
    
    apiProvider: ApiProvider | null
    connectionStatus: ConnectionStatus
    connectionError: string | null
    devices: Device[]
    machineState: MachineState | null
    selectedScale: Scale | null
    scaleSnapshot: ScaleSnapshot | null
    shotSettings: ShotSettings | null
    waterLevels: WaterLevels | null
    
    machineSnapshotConnection: WebSocketConnection | null
    scaleSnapshotConnection: WebSocketConnection | null
    shotSettingsConnection: WebSocketConnection | null
    waterLevelsConnection: WebSocketConnection | null
    
    // Recent shot metrics
    recentEspressoTime: number
    recentEspressoMaxFlow: number
    recentEspressoMaxPressure: number
    recentEspressoMaxWeight: number
    
    connect: (url: string) => Promise<void>
    reconnect: () => Promise<void>
    fetchDevices: () => Promise<void>
    scanForDevices: () => Promise<void>
    fetchMachineState: () => Promise<void>
    setMachineState: (newState: MachineStateType) => Promise<void>
    uploadProfile: (profile: ExtendedProfile) => Promise<void>
    updateShotSettings: (settings: ShotSettings) => Promise<void>
    setUsbCharging: (enabled: boolean) => Promise<void>
    selectScale: (scaleId: string) => Promise<void>
    tareScale: () => Promise<void>
    
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
    
    loadProfilesFromFiles: () => void
    getScales: () => Promise<Scale[]>
    profileId: string | null
    filteredWaterLevel: number;
}

export const useDataStore = create<DataStore>((set, get) => {
    let lastConnectionUrl: string | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    
    // Scale data handling
    const selectedScale: Scale | null = null
    const scaleSnapshot: ScaleSnapshot | null = null

    async function handleScaleData(scaleApi: ScaleApi, webSocketApi: WebSocketApi) {
        try {
            const initialSelectedScale = await scaleApi.getSelectedScale()
            set({ selectedScale: initialSelectedScale })

            const wsConnection = webSocketApi.connectToScaleSnapshot()
            
            wsConnection.onMessage((data) => {
                const snapshot = data as ScaleSnapshot
                set({ scaleSnapshot: snapshot })
            })
        } catch (error) {
            console.error('Failed to set up scale data handling:', error)
        }
    }

    return {
        profiles: [],
        profileId: null,
        disconnect() {
            // Clear any reconnect timer
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            
            // Clear shot timer if running
            if (shotTimerInterval) {
                clearInterval(shotTimerInterval);
                shotTimerInterval = null;
                shotStartTime = null;
                shotElapsedTime = 0;
            }
            
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
                connectionStatus: ConnectionStatus.Disconnected,
                connectionError: null,
                apiProvider: null,
                machineSnapshotConnection: null,
                scaleSnapshotConnection: null,
                shotSettingsConnection: null,
                waterLevelsConnection: null,
                machineState: null,
                selectedScale: null,
                scaleSnapshot: null,
                shotSettings: null,
                waterLevels: null,
                devices: [],
                profileId: null,
                filteredWaterLevel: 0,
                recentEspressoTime: 0,
                recentEspressoMaxFlow: 0,
                recentEspressoMaxPressure: 0,
                recentEspressoMaxWeight: 0
            });
        },
        fetchProfiles() {
            get().loadProfilesFromFiles();
        },
        apiProvider: null,
        connectionStatus: ConnectionStatus.Disconnected,
        connectionError: null,
        devices: [],
        machineState: null,
        selectedScale,
        scaleSnapshot,
        shotSettings: null,
        waterLevels: null,
        filteredWaterLevel: 0,
        recentEspressoTime: 0,
        recentEspressoMaxFlow: 0,
        recentEspressoMaxPressure: 0,
        recentEspressoMaxWeight: 0,
        machineSnapshotConnection: null,
        scaleSnapshotConnection: null,
        shotSettingsConnection: null,
        waterLevelsConnection: null,
        r1ConnectionAttempts: 0,
        r1LastConnectionError: null,
        r1AutoReconnect: true,
        r1ConnectionSettings: {
            hostname: 'localhost',
            port: 8080,
            useSecureProtocol: false
        },
        updateR1ConnectionSettings(settings) {
            set(state => ({
                r1ConnectionSettings: {
                    ...state.r1ConnectionSettings,
                    ...settings
                }
            }));
            
            // Force reconnect with new settings if we're already connected
            if (get().connectionStatus === ConnectionStatus.Connected || get().connectionStatus === ConnectionStatus.Connecting) {
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
            if (get().connectionStatus === ConnectionStatus.Disconnected || get().connectionStatus === ConnectionStatus.Error) {
                get().reconnect();
            }
        },
        async connect(url) {
            lastConnectionUrl = url

            // Increment connection attempts
            set(state => ({ 
                r1ConnectionAttempts: state.r1ConnectionAttempts + 1,
                connectionStatus: ConnectionStatus.Connecting, 
                connectionError: null,
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
                    connectionMethod: () => any,
                    connectionName: string,
                    onData: (data: any) => void
                ) => {
                    try {
                        const connection = connectionMethod();
                        
                        if (!connection) {
                            console.warn(`No connection returned for ${connectionName}`);
                            return null;
                        }
                        
                        // Ensure onMessage and onError methods exist before using them
                        if (connection && typeof connection.onMessage === 'function') {
                            connection.onMessage(onData);
                        }
                        
                        if (connection && typeof connection.onError === 'function') {
                            connection.onError((error: any) => {
                                console.error(`WebSocket error (${connectionName}):`, error);
                            });
                        }
                        
                        return connection;
                    } catch (error) {
                        console.error(`Failed to setup ${connectionName} websocket:`, error);
                        return null;
                    }
                };
                
                // Setup WebSocket connections for real-time updates
                try {
                    // Machine snapshot
                    const machineSnapshotConnection = setupWebsocket(
                        () => apiProvider.websocket.connectToMachineSnapshot(),
                        'machine snapshot',
                        (data) => {
                            const previousState = get().machineState;
                            const newState = data as MachineState;
                            
                            // Determine state keys for comparison
                            const previousStateKey = previousState ? 
                                `${previousState.state}.${previousState.substate}` : null;
                            const newStateKey = `${newState.state}.${newState.substate}`;
                            
                            // Check for entering espresso preinfusion
                            const isEnteringPreinfusion = newStateKey === 'espresso.preinfusion' && 
                                                         previousStateKey !== 'espresso.preinfusion';
                            
                            // Check for exiting espresso (from any espresso substate)
                            const isExitingEspresso = previousState && 
                                                     previousState.state === 'espresso' && 
                                                     newState.state !== 'espresso';
                            
                            // Track max values during the shot
                            let maxFlow = 0;
                            let maxPressure = 0;
                            let maxWeight = 0;
                            
                            if (previousState && previousState.state === 'espresso') {
                                // Track metrics during the shot
                                maxFlow = Math.max(previousState.flow || 0, get().recentEspressoMaxFlow || 0);
                                maxPressure = Math.max(previousState.pressure || 0, get().recentEspressoMaxPressure || 0);
                                
                                // Track max weight from scale if available
                                const currentWeight = get().scaleSnapshot?.weight || 0;
                                maxWeight = Math.max(currentWeight, get().recentEspressoMaxWeight || 0);
                            }
                            
                            if (isEnteringPreinfusion) {
                                // Start timer when entering preinfusion
                                console.log('Starting shot timer');
                                shotStartTime = Date.now();
                                shotElapsedTime = 0;
                                
                                // Reset max values for a new shot
                                maxFlow = 0;
                                maxPressure = 0;
                                maxWeight = 0;
                                
                                // Clear any existing timer just in case
                                if (shotTimerInterval) {
                                    clearInterval(shotTimerInterval);
                                }
                                
                                // Create new timer that updates elapsed time every 100ms
                                shotTimerInterval = setInterval(() => {
                                    if (shotStartTime) {
                                        shotElapsedTime = (Date.now() - shotStartTime) / 1000;
                                        
                                        // Update max values during shot
                                        const machineState = get().machineState;
                                        if (machineState && machineState.state === 'espresso') {
                                            set({
                                                recentEspressoMaxFlow: Math.max(machineState.flow || 0, get().recentEspressoMaxFlow || 0),
                                                recentEspressoMaxPressure: Math.max(machineState.pressure || 0, get().recentEspressoMaxPressure || 0),
                                                recentEspressoMaxWeight: Math.max(get().scaleSnapshot?.weight || 0, get().recentEspressoMaxWeight || 0)
                                            });
                                        }
                                        
                                        // Refresh the machine state UI by updating the timestamp
                                        set({ machineState: { ...get().machineState!, timestamp: new Date().toISOString() } });
                                    }
                                }, 100);
                            } else if (isExitingEspresso) {
                                // Stop timer when exiting espresso state
                                if (shotTimerInterval) {
                                    clearInterval(shotTimerInterval);
                                    shotTimerInterval = null;
                                    
                                    // Final update to ensure accuracy
                                    if (shotStartTime) {
                                        shotElapsedTime = (Date.now() - shotStartTime) / 1000;
                                        console.log(`Shot ended. Duration: ${shotElapsedTime.toFixed(1)}s`);
                                        
                                        // Store the final shot time and max values in state
                                        set({ 
                                            recentEspressoTime: shotElapsedTime,
                                            recentEspressoMaxFlow: get().recentEspressoMaxFlow,
                                            recentEspressoMaxPressure: get().recentEspressoMaxPressure,
                                            recentEspressoMaxWeight: get().recentEspressoMaxWeight
                                        });
                                        shotStartTime = null;
                                    }
                                }
                            } else if (previousState && previousState.state === 'espresso') {
                                // Continue updating max values during the shot
                                set({
                                    recentEspressoMaxFlow: maxFlow,
                                    recentEspressoMaxPressure: maxPressure,
                                    recentEspressoMaxWeight: maxWeight
                                });
                            }
                            
                            // Update state with new machine state
                            set({ machineState: newState });
                        }
                    );
                    
                    // Scale snapshot
                    const scaleSnapshotConnection = setupWebsocket(
                        () => apiProvider.websocket.connectToScaleSnapshot(),
                        'scale snapshot',
                        (data) => {
                            set({ scaleSnapshot: data });
                        }
                    );
                    
                    // Shot settings
                    const shotSettingsConnection = setupWebsocket(
                        () => apiProvider.websocket.connectToShotSettings(),
                        'shotSettings',
                        (data) => set({ shotSettings: data })
                    );
                    
                    // Water levels
                    const waterLevelsConnection = setupWebsocket(
                        () => apiProvider.websocket.connectToWaterLevels(),
                        'waterLevels',
                        (data) => {
                            // Store the raw water levels data
                            set({ waterLevels: data });
                            
                            // Process water level for smoother display
                            if (data && typeof data.currentPercentage === 'number') {
                                const now = Date.now();
                                const level = data.currentPercentage;
                                
                                // Add current reading to history
                                waterLevelHistory.push({timestamp: now, level});
                                
                                // Remove old readings (older than 30 seconds)
                                waterLevelHistory = waterLevelHistory.filter(
                                    entry => now - entry.timestamp < WATER_LEVEL_HISTORY_DURATION
                                );
                                
                                // Only update the filtered value every 10 seconds
                                if (now - lastWaterLevelUpdateTime >= WATER_LEVEL_UPDATE_INTERVAL) {
                                    // Calculate average of readings in history
                                    const sum = waterLevelHistory.reduce((acc, entry) => acc + entry.level, 0);
                                    filteredWaterLevel = waterLevelHistory.length > 0 
                                        ? sum / waterLevelHistory.length 
                                        : level;
                                    
                                    // Update the state with filtered value
                                    set({ filteredWaterLevel });
                                    lastWaterLevelUpdateTime = now;
                                }
                            }
                        }
                    );
                    
                    // Update state with connections
                    set({
                        machineSnapshotConnection,
                        scaleSnapshotConnection,
                        shotSettingsConnection,
                        waterLevelsConnection,
                        connectionStatus: ConnectionStatus.Connected,
                        connectionError: null,
                        r1ConnectionAttempts: 0,
                        r1LastConnectionError: null,
                    });
                    
                } catch (error) {
                    console.error('Failed to connect to API:', error);
                    
                    // Create a user-friendly error message
                    const errorMessage = error instanceof Error 
                        ? error.message 
                        : 'Unknown connection error';
                    
                    // Update store with error state
                    set({ 
                        connectionStatus: ConnectionStatus.Error,
                        connectionError: errorMessage,
                        r1LastConnectionError: errorMessage,
                    });
                    
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
            } catch (error) {
                console.error('Failed to connect to API:', error);
                
                // Create a user-friendly error message
                const errorMessage = error instanceof Error 
                    ? error.message 
                    : 'Unknown connection error';
                
                // Update store with error state
                set({ 
                    connectionStatus: ConnectionStatus.Error,
                    connectionError: errorMessage,
                    r1LastConnectionError: errorMessage,
                });
                
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
                    
                    await get().connect(fullUrl);
                } catch (error) {
                    console.error('Error during reconnect:', error);
                    // We don't need to update state here as connect will handle that
                }
            } else {
                console.error('Cannot reconnect - no previous connection URL');
                set({ 
                    connectionError: 'No previous connection URL available',
                    r1LastConnectionError: 'No previous connection URL available' 
                });
            }
        },
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
                    // Fall back to direct API call without using baseUrl property
                    const apiUrl = getApiUrl(apiProvider);
                    await axios.get(`${apiUrl}/api/v1/devices/scan`, {
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
        async fetchMachineState() {
            const { apiProvider } = get()
            if (!apiProvider) return
            
            try {
                const machineState = await apiProvider.machine.getState()
                set({ machineState })
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
        async uploadProfile(profile: ExtendedProfile) {
            const { apiProvider } = get()
            if (!apiProvider || !apiProvider.machine) return
            
            try {
                // Need to cast to handle the extended profile type
                await apiProvider.machine.uploadProfile(profile as any);
                
                // If we successfully uploaded the profile, update the store
                if (profile.id) {
                    set({ profileId: profile.id });
                }
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
        async loadProfilesFromFiles() {
            try {
                const profiles: Profile[] = [];
                
                // First try to load from localStorage for user customizations
                const savedProfiles = localStorage.getItem('profiles');
                if (savedProfiles) {
                    try {
                        const parsed = JSON.parse(savedProfiles);
                        if (Array.isArray(parsed)) {
                            profiles.push(...parsed);
                            console.log('Loaded', parsed.length, 'profiles from localStorage');
                        }
                    } catch (e) {
                        console.error('Failed to parse saved profiles', e);
                    }
                }
                
                // Load profiles from profiles-list.json
                try {
                    // Add cache busting to prevent 304 responses
                    const timestamp = new Date().getTime();
                    const response = await fetch(`/profiles-list.json?_=${timestamp}`, {
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch profiles list: ${response.status}`);
                    }
                    
                    // Directly use the parsed array from the response
                    const profilesList: string[] = await response.json(); 
                    
                    // Check if the response is actually an array
                    if (!Array.isArray(profilesList)) {
                        throw new Error('Invalid profiles list format: Expected an array of filenames.');
                    }
                    
                    console.log('Found', profilesList.length, 'profiles in profiles-list.json');
                    
                    // Load each profile file using the array directly
                    const profilePromises = profilesList.map((profileFile: string) => 
                        fetch(`/profiles/${profileFile}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to fetch profile: ${profileFile}`);
                                }
                                return response.json();
                            })
                            .then(profileData => {
                                // Ensure the profile has an ID
                                if (!profileData.id && profileFile.endsWith('.json')) {
                                    profileData.id = profileFile.slice(0, -5); // Remove .json
                                }
                                return profileData as Profile;
                            })
                            .catch(err => {
                                console.error(`Error loading profile ${profileFile}:`, err);
                                return null;
                            })
                    );
                    
                    const loadedProfiles = await Promise.all(profilePromises);
                    const validProfiles = loadedProfiles.filter(Boolean) as Profile[];
                    
                    // Add to existing profiles
                    profiles.push(...validProfiles);
                    console.log('Loaded', validProfiles.length, 'profiles from profile files');
                    
                    // Update state with all loaded profiles
                    set({ profiles });
                    
                    // Update current profile if previously saved
                    const savedProfileId = localStorage.getItem(StorageKey.LastUsedProfile);
                    const hasValidSavedProfile = savedProfileId && profiles.some(p => p?.id === savedProfileId);

                    if (hasValidSavedProfile && savedProfileId) {
                        set({ profileId: savedProfileId });
                        console.log('Restored last used profile:', savedProfileId);
                    } else if (profiles.length > 0) {
                        // Find the first profile with a valid ID
                        const firstValidProfile = profiles.find(p => p && typeof p.id === 'string');
                        if (firstValidProfile && firstValidProfile.id) {
                            set({ profileId: firstValidProfile.id });
                            console.log('Set default profile:', firstValidProfile.id);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load profiles from profiles-list.json:', e);
                }
            } catch (error) {
                console.error('Failed to load profiles:', error);
            }
        },
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
        }
    }
})

// Update legacy hooks to use R1 state
export function useIsOn() {
    const machineState = useDataStore(state => state.machineState)
    return isMachineOn(machineState)
}

export function useStatus() {
    const { connectionStatus } = useDataStore()
    
    // Always use R1 API status logic
    if (connectionStatus === ConnectionStatus.Connected) {
        return Status.On
    } else if (connectionStatus === ConnectionStatus.Connecting) {
        return Status.Busy
    }
    return Status.Off
}

export function useScaleStatus() {
    const { selectedScale } = useDataStore()
    
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

/**
 * Hook to check if the R1 API is available at the specified URL
 */
export function useR1Availability() {
    const { r1ConnectionSettings } = useDataStore();
    const [isAvailable, setIsAvailable] = useState(false);
    
    const { hostname, port, useSecureProtocol } = r1ConnectionSettings;
    const protocol = useSecureProtocol ? 'https' : 'http';
    const serverUrl = `${protocol}://${hostname}:${port}`;
    
    useEffect(() => {
        const checkAvailability = async () => {
            try {
                // Use a simple HEAD request to check if R1 is responding
                await fetch(`${serverUrl}/api/v1/devices`, { 
                    method: 'HEAD',
                    // Short timeout to avoid long waits
                    signal: AbortSignal.timeout(1500)
                });
                setIsAvailable(true);
            } catch (e) {
                setIsAvailable(false);
            }
        };
        
        checkAvailability();
        
        // Periodic check for availability
        const interval = setInterval(checkAvailability, 10000);
        return () => clearInterval(interval);
    }, [serverUrl]);
    
    return isAvailable;
}

/**
 * Hook to automatically connect to available scales
 */
export function useAutoScaleConnection() {
    const selectedScale = useDataStore(state => state.selectedScale);
    const isR1Available = useR1Availability();
    
    useEffect(() => {
        // Only look for scales if R1 is available and no scale is currently selected
        if (!isR1Available || selectedScale) {
            return;
        }
        
        let mounted = true;
        
        const connectToScale = async () => {
            try {
                const { getScales, selectScale } = useDataStore.getState();
                
                // Safely get available scales
                if (typeof getScales === 'function') {
                    const scales = await getScales();
                    
                    // If we found scales and the component is still mounted, auto-connect
                    if (mounted && scales?.length > 0 && typeof selectScale === 'function') {
                        console.log('Auto-connecting to scale:', scales[0].name);
                        await selectScale(scales[0].id);
                    }
                }
            } catch (error) {
                console.error('Error auto-connecting to scale:', error);
            }
        };
        
        // Call immediately and then set up interval
        connectToScale();
        const interval = setInterval(connectToScale, 7000); // Check for scales every 7 seconds
        
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [isR1Available, selectedScale]);
}

export function useAutoConnectEffect() {
    const { 
        r1ConnectionSettings, 
        connectionStatus,
        connect, 
        disconnect,
    } = useDataStore();
    
    const isR1Available = useR1Availability();
    const { machineMode } = useUiStore();
    const machineModeRef = useRef(machineMode);
    machineModeRef.current = machineMode;
    
    const prevConnectionStatusRef = useRef(connectionStatus);
    const { setMachineMode } = useUiStore();
    const timeoutIdRef = useRef<number | undefined>(undefined);
    useEffect(() => void clearReffedTimeoutId(timeoutIdRef), [machineMode]);
    
    // Build R1 server URL with appropriate protocol
    const { hostname, port, useSecureProtocol } = r1ConnectionSettings;
    const protocol = useSecureProtocol ? 'https' : 'http';
    const r1Url = `${protocol}://${hostname}:${port}`;

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
            await useDataStore.getState().fetchMachineState();
            
            console.log('Machine data refresh completed');
        } catch (error) {
            console.error('Error refreshing machine data:', error);
        }
    }, []);

    // Effect to monitor connection status changes and update UI when connected
    useEffect(() => {
        // Only trigger actions when we transition from a non-connected to connected state
        if (connectionStatus === ConnectionStatus.Connected && prevConnectionStatusRef.current !== ConnectionStatus.Connected) {
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
                await connect(r1Url);
                
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
        disconnect, connect, 
        r1Url, isR1Available
    ]);
}

// Replace legacy property-based hooks with R1 state-based hooks
export function useMajorState() {
    const machineState = useDataStore(state => state.machineState)
    return getMajorState(machineState)
}

export function useMinorState() {
    const machineState = useDataStore(state => state.machineState)
    return getMinorState(machineState)
}

export function useWaterLevel() {
    const filteredLevel = useDataStore(state => state.filteredWaterLevel);
    const waterLevels = useDataStore(state => state.waterLevels);
    
    // If we have a filtered level, use it; otherwise fall back to raw value
    return filteredLevel || (waterLevels?.currentPercentage ?? 0);
}

export function usePhase() {
    const phase = useConnectionPhase();
    
    switch (phase) {
        case ConnectionPhase.ConnectingAdapters:
            return 'Connecting to DE1…';
        case ConnectionPhase.WaitingToReconnect:
            return 'Reconnecting shortly…';
        case ConnectionPhase.Irrelevant:
        default:
            return undefined;
    }
}

export function useConnectionPhase() {
    const { connectionStatus } = useDataStore()
    
    if (connectionStatus === ConnectionStatus.Connecting) {
        return ConnectionPhase.ConnectingAdapters
    }
    
    if (connectionStatus === ConnectionStatus.Error) {
        return ConnectionPhase.WaitingToReconnect
    }
    
    // For 'connected' or 'disconnected', it's considered irrelevant for this phase display
    return ConnectionPhase.Irrelevant
}

export function useCurrentProfileLabel() {
    const { profiles, profileId } = useDataStore()
    return useMemo(() => profiles.find(({ id }) => id === profileId)?.title, [profiles, profileId])
}

// Helper to create the appropriate API provider
function createApiProvider(url: string): ApiProvider {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_MOCK_API === 'true') {
        return new MockApiProvider()
    }
    
    return new R1ApiProvider(url)
}

// R1-specific hooks for direct access to R1 state
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

// R1 connection management hooks
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

function getApiUrl(apiProvider: ApiProvider, fallbackUrl?: string): string {
    // First try to use the provided fallback URL
    if (fallbackUrl) return fallbackUrl;
    
    // Try to access baseUrl property safely using type assertion
    const providerWithBaseUrl = apiProvider as any;
    if (providerWithBaseUrl.baseUrl) return providerWithBaseUrl.baseUrl;
    
    // Get from connection settings
    const store = useDataStore.getState();
    const { hostname, port, useSecureProtocol } = store.r1ConnectionSettings;
    const protocol = useSecureProtocol ? 'https' : 'http';
    return `${protocol}://${hostname}:${port}`;
}

// Add this function right before useScaleSnapshot()
export function useShotTime() {
    // When the machine is in an espresso state (preinfusion or pour), return the active shot timer
    // Otherwise, return the last completed shot time
    const machineState = useDataStore(state => state.machineState);
    const recentEspressoTime = useDataStore(state => state.recentEspressoTime);
    
    if (!machineState) return 0;
    
    if (machineState.state === 'espresso') {
        // Use the module-level variables to get the current shot time
        return shotElapsedTime;
    }
    
    return recentEspressoTime;
}

// Add functions to access the max values
export function useMaxFlow() {
    return useDataStore(state => state.recentEspressoMaxFlow);
}

export function useMaxPressure() {
    return useDataStore(state => state.recentEspressoMaxPressure);
}

export function useMaxWeight() {
    return useDataStore(state => state.recentEspressoMaxWeight);
}

// Add hook to access shot settings
export function useShotSettings() {
    return useDataStore(state => state.shotSettings);
}
