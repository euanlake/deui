import { MachineState, MachineStateType, Profile, ShotSettings } from '../models/Machine';

export interface MachineApi {
  getState(): Promise<MachineState>;
  setState(newState: MachineStateType): Promise<void>;
  
  // Profile management
  uploadProfile(profile: Profile): Promise<void>;
  getProfiles(): Promise<Profile[]>;
  getProfileById(profileId: string): Promise<Profile>;
  selectProfile(profileId: string): Promise<void>;
  
  // Settings
  updateShotSettings(settings: ShotSettings): Promise<void>;
  setUsbCharging(enabled: boolean): Promise<void>;
} 