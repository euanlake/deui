import { Device } from '../api/models/Device';
import { MachineState, MachineStateType, Profile, ShotSettings } from '../api/models/Machine';
import { Scale, ScaleSnapshot } from '../api/models/Scale';

// Re-export all R1 API models for standardized usage
export type {
  Device,
  MachineState,
  MachineStateType,
  Profile,
  Scale,
  ScaleSnapshot,
  ShotSettings
};

// Define additional types needed for the application
export interface WaterLevels {
  currentPercentage: number;
  warningThresholdPercentage: number;
}

// Enums for mapping R1 API state values to UI states
export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

// Mapping for machine modes
export enum MachineMode {
  Espresso = 'espresso',
  Steam = 'steam',
  HotWater = 'hotwater',
  Flush = 'flush',
  Sleep = 'sleep',
  Idle = 'idle'
}

// Helper functions for working with R1 API models

/**
 * Helper to determine if a machine is on based on state
 */
export function isMachineOn(machineState: MachineState | null): boolean {
  if (!machineState) return false;
  return machineState.state !== 'sleep';
}

/**
 * Helper to get major state value from machine state
 */
export function getMajorState(machineState: MachineState | null): number {
  if (!machineState) return 0;
  
  switch (machineState.state) {
    case 'sleep':
    case 'idle':
      return 0;
    case 'espresso':
      return 4;
    case 'steam':
      return 2;
    case 'hotwater':
      return 3;
    case 'flush':
      return 11;
    default:
      return 0;
  }
}

/**
 * Helper to get minor state value from machine state
 */
export function getMinorState(machineState: MachineState | null): number {
  if (!machineState) return 0;
  
  const stateKey = machineState.substate ? 
    `${machineState.state}.${machineState.substate}` : 
    machineState.state;
  
  switch (stateKey) {
    case 'espresso.preinfusion':
    case 'espresso.preinfuse':
      return 1;
    case 'espresso.pour':
      return 2;
    case 'steam.steaming':
      return 5;
    case 'hotwater.pouring':
      return 2;
    case 'flush':
      return 4;
    default:
      return 0;
  }
}

/**
 * Helper for mapping shot properties
 */
export const ShotProperty = {
  Pressure: 'pressure',
  Flow: 'flow',
  MixTemperature: 'mixTemperature',
  GroupTemperature: 'groupTemperature',
  Weight: 'weight',
  Time: 'time'
};

/**
 * Helper for mapping target properties
 */
export const TargetProperty = {
  TargetPressure: 'targetPressure',
  TargetFlow: 'targetFlow',
  TargetMixTemperature: 'targetMixTemperature',
  TargetGroupTemperature: 'targetGroupTemperature',
  TargetShotVolume: 'targetShotVolume',
  TargetWeight: 'targetWeight'
}; 