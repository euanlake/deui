export type MachineStateType = 'sleep' | 'idle' | 'espresso' | 'steam' | 'hotwater' | 'flush';

export interface MachineState {
  timestamp: string;
  state: string;
  substate: string;
  flow: number;
  pressure: number;
  targetFlow: number;
  targetPressure: number;
  mixTemperature: number;
  groupTemperature: number;
  targetMixTemperature: number;
  targetGroupTemperature: number;
  profileFrame: number;
  steamTemperature: number;
  usbChargerEnabled: boolean;
}

// Profile types for v2 JSON profiles
export type BeverageType = 'espresso' | 'filter' | 'pourover' | 'tea' | 'cleaning' | 'custom';
export type ProfileStepType = 'pressure' | 'flow' | 'temperature';
export type ExitConditionType = 'pressure' | 'flow' | 'volume' | 'weight' | 'temperature' | 'none';

export interface Profile {
  id?: string;              // Unique identifier (optional, generated if not provided)
  version: string;          // Profile format version
  title: string;            // Profile name
  notes?: string;           // Description or notes
  author: string;           // Profile creator
  beverage_type: BeverageType;
  steps: ProfileStep[];     // Main profile steps
  target_volume?: number;   // Target volume in ml
  target_weight?: number;   // Target weight in g
  target_volume_count_start?: number; // When to start counting volume
  tank_temperature?: number; // Water tank temperature in Celsius
  
  // Additional v2 fields
  lang?: string;            // Language code (ISO 639-1)
  created_at?: string;      // Creation timestamp
  modified_at?: string;     // Last modification timestamp
  reference_file?: string;  // Reference file name
  metadata?: Record<string, any>; // Additional metadata
}

export interface ProfileStep {
  type: ProfileStepType;
  name?: string;            // Optional step name
  value: number;            // Target value for the step (pressure in bar, flow in ml/s)
  duration: number;         // Duration in seconds
  temperature?: number;     // Temperature in Celsius
  
  // Advanced options
  exit_condition?: ExitConditionType; // Condition to exit the step
  exit_value?: number;      // Value at which to exit the step
  exit_if_above?: boolean;  // Exit if value is above or below
  
  // Pressure/flow ramping
  start_value?: number;     // Starting value for ramping
  transition_type?: 'fast' | 'smooth' | 'linear'; // How to transition to target value
}

export interface ShotSettings {
  steamSetting: number;
  targetSteamTemp: number;
  targetSteamDuration: number;
  targetHotWaterTemp: number;
  targetHotWaterVolume: number;
  targetHotWaterDuration: number;
  targetShotVolume: number;
  groupTemp: number;
} 