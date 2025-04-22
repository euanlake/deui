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

export interface Profile {
  version: string;
  title: string;
  notes?: string;
  author: string;
  beverage_type: string;
  steps: ProfileStep[];
  target_volume: number;
  target_weight: number;
  target_volume_count_start: number;
  tank_temperature: number;
}

export interface ProfileStep {
  type: 'pressure' | 'flow';
  value: number;
  duration: number;
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