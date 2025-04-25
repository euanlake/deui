import { renderHook, act } from '@testing-library/react-hooks';
import { useDataStore, useConnectionStatus, useMachineState, useR1ConnectionSettings } from '$/stores/data';
import { ConnectionStatus } from '$/shared/r1models';

// Mock the ApiProvider
jest.mock('$/api/adapters/r1/R1ApiProvider', () => {
  return {
    R1ApiProvider: jest.fn().mockImplementation(() => ({
      device: {
        getDevices: jest.fn().mockResolvedValue([
          { id: 'device1', name: 'DE1', type: 'machine' }
        ])
      },
      machine: {
        getMachineState: jest.fn().mockResolvedValue({
          id: 'device1',
          state: 'idle',
          substate: null,
          current_temperature: 92.5,
          target_temperature: 93.0,
          enabled_features: []
        }),
        setMachineState: jest.fn().mockResolvedValue(undefined),
        getShotSettings: jest.fn().mockResolvedValue({
          id: 'default_settings',
          profile_id: 'profile1'
        }),
        updateShotSettings: jest.fn().mockResolvedValue(undefined)
      },
      scale: {
        getScales: jest.fn().mockResolvedValue([]),
        getSelectedScale: jest.fn().mockResolvedValue(null),
        selectScale: jest.fn().mockResolvedValue(undefined),
        tareScale: jest.fn().mockResolvedValue(undefined)
      },
      websocket: {
        connectToMachineSnapshot: jest.fn().mockReturnValue({
          close: jest.fn(),
          onMessage: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn()
        }),
        connectToScaleSnapshot: jest.fn().mockReturnValue({
          close: jest.fn(),
          onMessage: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn()
        }),
        connectToShotSettings: jest.fn().mockReturnValue({
          close: jest.fn(),
          onMessage: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn()
        }),
        connectToWaterLevels: jest.fn().mockReturnValue({
          close: jest.fn(),
          onMessage: jest.fn(),
          onClose: jest.fn(),
          onError: jest.fn()
        }),
        closeAll: jest.fn()
      }
    }))
  };
});

describe('DataStore', () => {
  // Reset the store before each test
  beforeEach(() => {
    const { getState, setState } = useDataStore;
    setState({
      ...getState(),
      apiProvider: null,
      connectionStatus: ConnectionStatus.Disconnected,
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
      profiles: [],
      profileId: null
    });
  });

  describe('Connection', () => {
    it('should set connection status to connecting when connecting', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectionStatus());
      
      // Initial state
      expect(result.current.status).toBe(ConnectionStatus.Disconnected);
      
      // Start connection
      act(() => {
        useDataStore.getState().connect('http://localhost:8080');
      });
      
      // Should immediately set status to connecting
      expect(result.current.status).toBe(ConnectionStatus.Connecting);
    });
    
    it('should set connection status to connected after successful connection', async () => {
      const { result, waitForValueToChange } = renderHook(() => useConnectionStatus());
      
      // Start connection
      act(() => {
        useDataStore.getState().connect('http://localhost:8080');
      });
      
      // Wait for the status to change from Connecting to Connected
      await waitForValueToChange(() => result.current.status);
      
      // Should be connected now
      expect(result.current.status).toBe(ConnectionStatus.Connected);
    });
    
    it('should properly disconnect', async () => {
      const { result } = renderHook(() => useConnectionStatus());
      
      // Start connection
      await act(async () => {
        await useDataStore.getState().connect('http://localhost:8080');
      });
      
      // Disconnect
      act(() => {
        useDataStore.getState().disconnect();
      });
      
      // Should be disconnected
      expect(result.current.status).toBe(ConnectionStatus.Disconnected);
    });
  });
  
  describe('R1 Connection Settings', () => {
    it('should have default connection settings', () => {
      const { result } = renderHook(() => useR1ConnectionSettings());
      
      // Check default settings
      expect(result.current.settings).toEqual({
        hostname: 'localhost',
        port: 8080,
        useSecureProtocol: false
      });
    });
    
    it('should update connection settings', () => {
      const { result } = renderHook(() => useR1ConnectionSettings());
      
      // Update settings
      act(() => {
        result.current.updateSettings({
          hostname: '192.168.1.100',
          port: 9090,
          useSecureProtocol: true
        });
      });
      
      // Check updated settings
      expect(result.current.settings).toEqual({
        hostname: '192.168.1.100',
        port: 9090,
        useSecureProtocol: true
      });
    });
  });
  
  describe('Machine State', () => {
    it('should fetch machine state after connecting', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useMachineState());
      
      // Initially null
      expect(result.current).toBeNull();
      
      // Connect
      await act(async () => {
        await useDataStore.getState().connect('http://localhost:8080');
      });
      
      // Should have machine state now
      expect(result.current).not.toBeNull();
      expect(result.current?.state).toBe('idle');
    });
    
    it('should update machine state', async () => {
      // Setup the mock response for state update
      const mockProvider = require('$/api/adapters/r1/R1ApiProvider').R1ApiProvider.mock.results[0].value;
      mockProvider.machine.getMachineState.mockResolvedValueOnce({
        id: 'device1',
        state: 'espresso',
        substate: 'pour',
        current_temperature: 93.0,
        target_temperature: 93.0,
        enabled_features: ['pressure_control']
      });
      
      const { result } = renderHook(() => useMachineState());
      
      // Connect and initialize
      await act(async () => {
        await useDataStore.getState().connect('http://localhost:8080');
      });
      
      // Set machine state to espresso
      await act(async () => {
        await useDataStore.getState().setMachineState('espresso');
      });
      
      // Should have updated machine state
      expect(result.current?.state).toBe('espresso');
      expect(result.current?.substate).toBe('pour');
    });
  });
  
  describe('Profile Management', () => {
    it('should load profiles from files', async () => {
      // Mock fetch to return a profile
      global.fetch = jest.fn().mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          id: 'profile1',
          title: 'Test Profile',
          beverage_type: 'espresso',
          steps: []
        }),
        ok: true
      });
      
      // Call the method to load profiles
      await act(async () => {
        await useDataStore.getState().loadProfilesFromFiles();
      });
      
      // Check if the profile was loaded
      const { profiles } = useDataStore.getState();
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0].id).toBe('profile1');
    });
  });
}); 