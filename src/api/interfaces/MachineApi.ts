import { MachineState, MachineStateType, Profile, ShotSettings } from '../models/Machine';

export interface MachineApi {
  getState(): Promise<MachineState>;
  setState(newState: MachineStateType): Promise<void>;
  uploadProfile(profile: Profile): Promise<void>;
  updateShotSettings(settings: ShotSettings): Promise<void>;
  setUsbCharging(enabled: boolean): Promise<void>;
} 