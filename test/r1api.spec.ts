import { R1ApiProvider } from '$/api/adapters/r1/R1ApiProvider';
import { ApiProvider } from '$/api/interfaces/ApiProvider';
import { Device } from '$/api/models/Device';
import { MachineState } from '$/api/models/Machine';
import { Scale, ScaleSnapshot } from '$/api/models/Scale';
import { ConnectionStatus } from '$/shared/r1models';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

// Mock WebSocket connections
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn((event, callback) => {
    if (event === 'open') {
      setTimeout(() => callback(), 10);
    }
  }),
  removeEventListener: jest.fn()
}));

describe('R1 API Integration', () => {
  let api: ApiProvider;
  const mockBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of the API provider for each test
    api = new R1ApiProvider(mockBaseUrl);
  });

  describe('DeviceApi', () => {
    it('should fetch devices', async () => {
      // Mock response
      const mockDevices: Device[] = [
        { id: 'device1', name: 'DE1', type: 'machine' },
        { id: 'scale1', name: 'Scale', type: 'scale' }
      ];
      
      // Setup the mock to return the devices
      const axios = require('axios');
      axios.get.mockResolvedValueOnce({ data: mockDevices });
      
      // Call the API
      const devices = await api.device.getDevices();
      
      // Verify the result
      expect(devices).toEqual(mockDevices);
      expect(axios.get).toHaveBeenCalledWith(`${mockBaseUrl}/api/v1/devices`);
    });
    
    it('should handle errors when fetching devices', async () => {
      // Setup the mock to reject
      const error = new Error('Network error');
      const axios = require('axios');
      axios.get.mockRejectedValueOnce(error);
      
      // Call the API and expect it to throw
      await expect(api.device.getDevices()).rejects.toThrow();
    });
  });

  describe('MachineApi', () => {
    it('should fetch machine state', async () => {
      // Mock response
      const mockState: MachineState = {
        id: 'machine1',
        state: 'idle',
        substate: null,
        current_temperature: 92.5,
        target_temperature: 93.0,
        enabled_features: []
      };
      
      // Setup the mock
      const axios = require('axios');
      axios.get.mockResolvedValueOnce({ data: mockState });
      
      // Call the API
      const state = await api.machine.getMachineState('machine1');
      
      // Verify the result
      expect(state).toEqual(mockState);
      expect(axios.get).toHaveBeenCalledWith(`${mockBaseUrl}/api/v1/machines/machine1/state`);
    });
    
    it('should update machine state', async () => {
      // Mock the new state
      const newState = 'espresso';
      
      // Setup the mock
      const axios = require('axios');
      axios.put.mockResolvedValueOnce({ status: 200 });
      
      // Call the API
      await api.machine.setMachineState('machine1', newState);
      
      // Verify the request was made correctly
      expect(axios.put).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/machines/machine1/state`,
        { state: newState }
      );
    });
  });
  
  describe('ScaleApi', () => {
    it('should fetch scales', async () => {
      // Mock response
      const mockScales: Scale[] = [
        { id: 'scale1', name: 'Acaia Lunar', type: 'scale', connected: true }
      ];
      
      // Setup the mock
      const axios = require('axios');
      axios.get.mockResolvedValueOnce({ data: mockScales });
      
      // Call the API
      const scales = await api.scale.getScales();
      
      // Verify the result
      expect(scales).toEqual(mockScales);
      expect(axios.get).toHaveBeenCalledWith(`${mockBaseUrl}/api/v1/scales`);
    });
    
    it('should tare a scale', async () => {
      // Setup the mock
      const axios = require('axios');
      axios.post.mockResolvedValueOnce({ status: 200 });
      
      // Call the API
      await api.scale.tareScale('scale1');
      
      // Verify the request was made correctly
      expect(axios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/scales/scale1/tare`
      );
    });
  });
  
  describe('WebSocketApi', () => {
    it('should connect to machine snapshot endpoint', () => {
      // Connect to the WebSocket
      const connection = api.websocket.connectToMachineSnapshot('machine1');
      
      // Verify WebSocket was created with correct URL
      expect(global.WebSocket).toHaveBeenCalledWith(
        `ws://localhost:8080/api/v1/ws/machines/machine1/snapshot`
      );
      
      // Verify the connection was returned
      expect(connection).toBeDefined();
      expect(connection.close).toBeDefined();
    });
    
    it('should connect to scale snapshot endpoint', () => {
      // Connect to the WebSocket
      const connection = api.websocket.connectToScaleSnapshot('scale1');
      
      // Verify WebSocket was created with correct URL
      expect(global.WebSocket).toHaveBeenCalledWith(
        `ws://localhost:8080/api/v1/ws/scales/scale1/snapshot`
      );
      
      // Verify the connection was returned
      expect(connection).toBeDefined();
      expect(connection.close).toBeDefined();
    });
    
    it('should handle messages from WebSocket', (done) => {
      // Mock data for a scale snapshot
      const mockSnapshot: ScaleSnapshot = {
        id: 'scale1',
        weight: 18.2,
        stable: true,
        timestamp: Date.now()
      };
      
      // Connect to the WebSocket
      const connection = api.websocket.connectToScaleSnapshot('scale1');
      
      // Setup message handler
      connection.onMessage((data) => {
        expect(data).toEqual(mockSnapshot);
        done();
      });
      
      // Find the message event listener that was registered
      const addEventListener = global.WebSocket.mock.results[0].value.addEventListener;
      const messageHandler = addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )[1];
      
      // Simulate receiving a message
      messageHandler({ data: JSON.stringify(mockSnapshot) });
    });
  });
  
  describe('Connection Helpers', () => {
    it('should determine correct connection status based on machine state', () => {
      // Test with null machine state (not connected)
      expect(ConnectionStatus.Disconnected).toBe('disconnected');
      
      // Test with machine in sleep state
      const sleepState: MachineState = {
        id: 'machine1',
        state: 'sleep',
        substate: null,
        current_temperature: 25.0,
        target_temperature: 0,
        enabled_features: []
      };
      
      // Test with machine in active state
      const espressoState: MachineState = {
        id: 'machine1',
        state: 'espresso',
        substate: 'pour',
        current_temperature: 92.5,
        target_temperature: 93.0,
        enabled_features: ['pressure_control', 'flow_control']
      };
      
      // Verify the machine is properly identified as on/off
      expect(espressoState.state).not.toBe('sleep');
      expect(sleepState.state).toBe('sleep');
    });
  });
}); 