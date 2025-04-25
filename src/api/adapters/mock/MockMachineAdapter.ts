import { MachineApi } from '../../interfaces/MachineApi';
import { MachineState, MachineStateType, Profile, ShotSettings } from '../../models/Machine';

// Sample profiles for testing
const MOCK_PROFILES: Profile[] = [
  {
    id: 'default-espresso',
    version: '2.0',
    title: 'Default Espresso',
    notes: 'A standard espresso profile with 9 bar pressure',
    author: 'Decent',
    beverage_type: 'espresso',
    steps: [
      {
        type: 'pressure',
        name: 'Preinfusion',
        value: 2.5,
        duration: 10
      },
      {
        type: 'pressure',
        name: 'Extraction',
        value: 9.0,
        duration: 25
      },
      {
        type: 'pressure',
        name: 'Decline',
        value: 6.0,
        duration: 10,
        exit_condition: 'pressure',
        exit_value: 6.0,
        exit_if_above: false
      }
    ],
    target_weight: 36,
    tank_temperature: 93
  },
  {
    id: 'flow-profile',
    version: '2.0',
    title: 'Gentle Flow Profile',
    notes: 'A smooth flow profile for lighter roasts',
    author: 'App User',
    beverage_type: 'espresso',
    steps: [
      {
        type: 'flow',
        name: 'Preinfusion',
        value: 2.0,
        duration: 15
      },
      {
        type: 'flow',
        name: 'Ramp Up',
        value: 4.0,
        duration: 10,
        start_value: 2.0,
        transition_type: 'smooth'
      },
      {
        type: 'flow',
        name: 'Decline',
        value: 1.5,
        duration: 20,
        start_value: 4.0,
        transition_type: 'linear'
      }
    ],
    target_weight: 40,
    tank_temperature: 94
  }
];

export class MockMachineAdapter implements MachineApi {
  private machineState: MachineState = {
    timestamp: new Date().toISOString(),
    state: 'idle',
    substate: 'ready',
    flow: 0,
    pressure: 0,
    targetFlow: 0,
    targetPressure: 0,
    mixTemperature: 92.5,
    groupTemperature: 93.0,
    targetMixTemperature: 93.0,
    targetGroupTemperature: 93.0,
    profileFrame: 0,
    steamTemperature: 160,
    usbChargerEnabled: true
  };
  
  private shotSettings: ShotSettings = {
    steamSetting: 1,
    targetSteamTemp: 160,
    targetSteamDuration: 60,
    targetHotWaterTemp: 85,
    targetHotWaterVolume: 200,
    targetHotWaterDuration: 30,
    targetShotVolume: 36,
    groupTemp: 93
  };
  
  private activeProfileId: string = 'default-espresso';
  private profiles: Profile[] = [...MOCK_PROFILES];
  
  async getState(): Promise<MachineState> {
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.machineState));
  }
  
  async setState(newState: MachineStateType): Promise<void> {
    // Update the state
    this.machineState = {
      ...this.machineState,
      timestamp: new Date().toISOString(),
      state: newState,
      substate: newState === 'espresso' ? 'preinfusion' : 'ready'
    };
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  async uploadProfile(profile: Profile): Promise<void> {
    // Generate an ID if one doesn't exist
    const profileWithId = {
      ...profile,
      id: profile.id || `profile-${Date.now()}`
    };
    
    // Check if profile exists and replace it, otherwise add it
    const existingIndex = this.profiles.findIndex(p => p.id === profileWithId.id);
    if (existingIndex >= 0) {
      this.profiles[existingIndex] = profileWithId;
    } else {
      this.profiles.push(profileWithId);
    }
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  async getProfiles(): Promise<Profile[]> {
    // Return a deep copy to prevent external modification
    await new Promise(resolve => setTimeout(resolve, 300));
    return JSON.parse(JSON.stringify(this.profiles));
  }
  
  async getProfileById(profileId: string): Promise<Profile> {
    // Find the profile
    const profile = this.profiles.find(p => p.id === profileId);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!profile) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }
    
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(profile));
  }
  
  async selectProfile(profileId: string): Promise<void> {
    // Check if profile exists
    const profile = this.profiles.find(p => p.id === profileId);
    
    if (!profile) {
      throw new Error(`Profile with ID ${profileId} not found`);
    }
    
    // Set as active profile
    this.activeProfileId = profileId;
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  async updateShotSettings(settings: ShotSettings): Promise<void> {
    // Update the settings
    this.shotSettings = {
      ...this.shotSettings,
      ...settings
    };
    
    // Update machine state if needed
    this.machineState = {
      ...this.machineState,
      targetMixTemperature: settings.groupTemp,
      targetGroupTemperature: settings.groupTemp
    };
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  async setUsbCharging(enabled: boolean): Promise<void> {
    // Update the USB charging state
    this.machineState = {
      ...this.machineState,
      usbChargerEnabled: enabled
    };
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 150));
  }
} 