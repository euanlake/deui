import { create } from 'zustand';
import { ApiProvider } from '../api/interfaces/ApiProvider';
import { R1ApiProvider } from '../api/adapters/r1/R1ApiProvider';
import { MockApiProvider } from '../api/adapters/mock/MockApiProvider';
import { Device } from '../api/models/Device';
import { MachineState, ShotSettings } from '../api/models/Machine';
import { Scale, ScaleSnapshot } from '../api/models/Scale';
import { WebSocketConnection } from '../api/interfaces/WebSocketConnection';

// Determine which API provider to use based on environment or config
const createApiProvider = (url: string): ApiProvider => {
  // For development/testing, use the mock provider
  if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_API === 'true') {
    return new MockApiProvider();
  }
  
  // For production, use the R1 provider
  return new R1ApiProvider(url);
};

interface DataStore {
  // API provider
  apiProvider: ApiProvider | null;
  
  // State
  devices: Device[];
  machineState: MachineState | null;
  selectedScale: Scale | null;
  scaleSnapshot: ScaleSnapshot | null;
  shotSettings: ShotSettings | null;
  waterLevels: { currentPercentage: number; warningThresholdPercentage: number } | null;
  
  // WebSocket connections
  machineSnapshotConnection: WebSocketConnection | null;
  scaleSnapshotConnection: WebSocketConnection | null;
  shotSettingsConnection: WebSocketConnection | null;
  waterLevelsConnection: WebSocketConnection | null;
  
  // Connection management
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  
  // Device operations
  fetchDevices: () => Promise<void>;
  scanForDevices: () => Promise<void>;
  
  // Machine operations
  fetchMachineState: () => Promise<void>;
  setMachineState: (newState: string) => Promise<void>;
  uploadProfile: (profile: any) => Promise<void>;
  updateShotSettings: (settings: ShotSettings) => Promise<void>;
  setUsbCharging: (enabled: boolean) => Promise<void>;
  
  // Scale operations
  selectScale: (scaleId: string) => Promise<void>;
  tareScale: () => Promise<void>;
}

export const useDataStore = create<DataStore>((set, get) => {
  return {
    // Initialize state
    apiProvider: null,
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
    
    // Connect to the API provider
    async connect(url) {
      // Create API provider
      const apiProvider = createApiProvider(url);
      set({ apiProvider });
      
      // Fetch initial data
      await get().fetchDevices();
      await get().fetchMachineState();
      
      // Setup WebSocket connections
      const machineSnapshotConnection = apiProvider.websocket.connectToMachineSnapshot();
      machineSnapshotConnection.onMessage((data) => {
        set({ machineState: data });
      });
      
      const scaleSnapshotConnection = apiProvider.websocket.connectToScaleSnapshot();
      scaleSnapshotConnection.onMessage((data) => {
        set({ scaleSnapshot: data });
      });
      
      const shotSettingsConnection = apiProvider.websocket.connectToShotSettings();
      shotSettingsConnection.onMessage((data) => {
        set({ shotSettings: data });
      });
      
      const waterLevelsConnection = apiProvider.websocket.connectToWaterLevels();
      waterLevelsConnection.onMessage((data) => {
        set({ waterLevels: data });
      });
      
      set({
        machineSnapshotConnection,
        scaleSnapshotConnection,
        shotSettingsConnection,
        waterLevelsConnection
      });
    },
    
    // Disconnect from the API provider
    disconnect() {
      const { 
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
      
      // Reset state
      set({
        apiProvider: null,
        machineSnapshotConnection: null,
        scaleSnapshotConnection: null,
        shotSettingsConnection: null,
        waterLevelsConnection: null
      });
    },
    
    // Device operations
    async fetchDevices() {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        const devices = await apiProvider.device.getDevices();
        set({ devices });
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
    },
    
    async scanForDevices() {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.device.scanForDevices();
        // After scanning, fetch the updated device list
        await get().fetchDevices();
      } catch (error) {
        console.error('Error scanning for devices:', error);
      }
    },
    
    // Machine operations
    async fetchMachineState() {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        const machineState = await apiProvider.machine.getState();
        set({ machineState });
      } catch (error) {
        console.error('Error fetching machine state:', error);
      }
    },
    
    async setMachineState(newState) {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.machine.setState(newState as any);
        // After setting state, fetch the updated state
        await get().fetchMachineState();
      } catch (error) {
        console.error('Error setting machine state:', error);
      }
    },
    
    async uploadProfile(profile) {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.machine.uploadProfile(profile);
      } catch (error) {
        console.error('Error uploading profile:', error);
      }
    },
    
    async updateShotSettings(settings) {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.machine.updateShotSettings(settings);
      } catch (error) {
        console.error('Error updating shot settings:', error);
      }
    },
    
    async setUsbCharging(enabled) {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.machine.setUsbCharging(enabled);
      } catch (error) {
        console.error('Error setting USB charging:', error);
      }
    },
    
    // Scale operations
    async selectScale(scaleId) {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.scale.selectScale(scaleId);
        const selectedScale = await apiProvider.scale.getSelectedScale();
        set({ selectedScale });
      } catch (error) {
        console.error('Error selecting scale:', error);
      }
    },
    
    async tareScale() {
      const { apiProvider } = get();
      if (!apiProvider) return;
      
      try {
        await apiProvider.scale.tare();
      } catch (error) {
        console.error('Error taring scale:', error);
      }
    }
  };
});

// Custom hooks for accessing the store
export function useMachineState() {
  return useDataStore(state => state.machineState);
}

export function useScaleSnapshot() {
  return useDataStore(state => state.scaleSnapshot);
}

export function useDevices() {
  return useDataStore(state => state.devices);
}

export function useSelectedScale() {
  return useDataStore(state => state.selectedScale);
} 