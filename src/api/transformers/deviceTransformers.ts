import { Device } from '../models/Device';

export function transformR1DeviceToDevice(r1Device: any): Device {
  return {
    id: r1Device.id,
    name: r1Device.name,
    type: determineDeviceType(r1Device.name),
    connected: r1Device.state === 'connected'
  };
}

function determineDeviceType(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('de1')) return 'machine';
  if (lowerName.includes('scale')) return 'scale';
  return 'unknown';
} 