import { Device } from '../models/Device';

export function transformR1DeviceToDevice(r1Device: any): Device {
  return {
    id: r1Device.id,
    name: r1Device.name,
    type: determineDeviceType(r1Device.name),
    connectionState: r1Device.state === 'connected' ? 'connected' : 'disconnected'
  };
}

function determineDeviceType(name: string): 'machine' | 'scale' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('de1')) return 'machine';
  // Default to scale for all other devices
  return 'scale';
} 