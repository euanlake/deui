import { Device } from '../models/Device';

export interface DeviceApi {
  getDevices(): Promise<Device[]>;
  scanForDevices(): Promise<void>;
} 