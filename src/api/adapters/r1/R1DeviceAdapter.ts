import axios from 'axios';
import { DeviceApi } from '../../interfaces/DeviceApi';
import { Device } from '../../models/Device';
import { transformR1DeviceToDevice } from '../../transformers/restTransformers';
import { ErrorCategory, handleR1Error } from '../../utils/errorHandling';

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
    } catch (error: any) {
      console.error('Error fetching devices from R1:', error);
      
      // Process the error using our error handling utility
      const appError = handleR1Error({
        message: error?.message || 'Failed to fetch devices from R1',
        category: ErrorCategory.DEVICE,
        code: 'device.list_failed',
        originalError: error
      });
      
      // Throw a new error with the user-friendly message
      throw new Error(appError.message);
    }
  }
  
  /**
   * Scan for new devices
   * Uses R1 endpoint: GET /api/v1/devices/scan
   */
  async scanForDevices(): Promise<void> {
    try {
      await axios.get(`${this.baseUrl}/api/v1/devices/scan`);
    } catch (error: any) {
      console.error('Error scanning for devices with R1:', error);
      
      // Determine if this is a timeout issue (scanning can take time)
      const isTimeout = error?.code === 'ECONNABORTED' || 
                       (error?.message && error.message.includes('timeout'));
      
      // Use different error codes based on the type of error
      const errorCode = isTimeout ? 'device.scan_timeout' : 'device.scan_failed';
      
      // Process the error using our error handling utility
      const appError = handleR1Error({
        message: error?.message || 'Failed to scan for devices with R1',
        category: ErrorCategory.DEVICE,
        code: errorCode,
        originalError: error,
        // Add suggestion to wait longer if it was a timeout
        suggestions: isTimeout ? ['Scanning can take time, try waiting longer'] : undefined
      });
      
      // Throw a new error with the user-friendly message
      throw new Error(appError.message);
    }
  }
} 