import axios from 'axios';
import { DeviceApi } from '../../interfaces/DeviceApi';
import { Device } from '../../models/Device';
import { transformR1DeviceToDevice } from '../../transformers/restTransformers';

export class R1DeviceAdapter implements DeviceApi {
  private readonly baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get available devices
   * Uses R1 endpoint: GET /api/v1/devices
   */
  async getDevices(): Promise<Device[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/devices`);
      
      // Transform R1 device data to our Device model
      return response.data.map(transformR1DeviceToDevice);
    } catch (error) {
      console.error('Error fetching devices from R1:', error);
      throw new Error('Failed to fetch devices from R1');
    }
  }
  
  /**
   * Scan for new devices
   * Uses R1 endpoint: GET /api/v1/devices/scan
   */
  async scanForDevices(): Promise<void> {
    try {
      await axios.get(`${this.baseUrl}/api/v1/devices/scan`);
    } catch (error) {
      console.error('Error scanning for devices with R1:', error);
      throw new Error('Failed to scan for devices with R1');
    }
  }
} 