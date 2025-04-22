/**
 * Represents a Bluetooth device (DE1, scale, etc.)
 */
export interface Device {
  /**
   * Unique identifier for the device (typically MAC address)
   */
  id: string;
  
  /**
   * Human-readable name of the device
   */
  name: string;
  
  /**
   * Type of device (machine, scale)
   */
  type: 'machine' | 'scale';
  
  /**
   * Connection state of the device
   */
  connectionState: 'connected' | 'disconnected';
} 