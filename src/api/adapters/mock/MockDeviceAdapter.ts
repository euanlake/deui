import { DeviceApi } from '../../interfaces/DeviceApi';
import { Device } from '../../models/Device';

export class MockDeviceAdapter implements DeviceApi {
  private mockDevices: Device[] = [
    {
      id: 'mock-de1',
      name: 'Mock DE1',
      type: 'machine',
      connectionState: 'connected'
    },
    {
      id: 'mock-scale',
      name: 'Mock Decent Scale',
      type: 'scale',
      connectionState: 'connected'
    }
  ];
  
  async getDevices(): Promise<Device[]> {
    return [...this.mockDevices];
  }
  
  async scanForDevices(): Promise<void> {
    console.log('Mock scanning for devices');
    // Simulate a new device being found
    if (!this.mockDevices.some(d => d.id === 'mock-scale-2')) {
      this.mockDevices.push({
        id: 'mock-scale-2',
        name: 'Mock Felicita Arc Scale',
        type: 'scale',
        connectionState: 'disconnected'
      });
    }
  }
} 