/**
 * Represents a scale device
 */
export interface Scale {
  /**
   * Unique identifier for the scale
   */
  id: string;
  
  /**
   * Human-readable name of the scale
   */
  name: string;
  
  /**
   * Type of scale (always 'scale')
   */
  type: 'scale';
  
  /**
   * Connection state of the scale
   */
  connectionState: 'connected' | 'disconnected';
  
  /**
   * Battery level percentage (0-100)
   */
  batteryLevel: number;
}

/**
 * Represents a scale weight reading snapshot
 */
export interface ScaleSnapshot {
  /**
   * Timestamp of the reading
   */
  timestamp: string;
  
  /**
   * Weight reading in grams
   */
  weight: number;
  
  /**
   * Battery level percentage (0-100)
   */
  batteryLevel: number;
} 