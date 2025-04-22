import { MachineApi } from '../../interfaces/MachineApi';
import { MachineState, MachineStateType, Profile, ShotSettings } from '../../models/Machine';

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
    steamTemperature: 150.0,
    usbChargerEnabled: true
  };

  private shotSettings: ShotSettings = {
    steamSetting: 1,
    targetSteamTemp: 150,
    targetSteamDuration: 30,
    targetHotWaterTemp: 90,
    targetHotWaterVolume: 250,
    targetHotWaterDuration: 15,
    targetShotVolume: 30,
    groupTemp: 93.0
  };
  
  async getState(): Promise<MachineState> {
    return { ...this.machineState, timestamp: new Date().toISOString() };
  }
  
  async setState(newState: MachineStateType): Promise<void> {
    console.log(`Mock setting machine state to ${newState}`);
    this.machineState.state = newState;
    this.machineState.substate = newState === 'idle' ? 'ready' : 'preinfuse';
    
    // Simulate various states
    if (newState === 'espresso') {
      this.machineState.flow = 2.0;
      this.machineState.pressure = 9.0;
    } else if (newState === 'steam') {
      this.machineState.steamTemperature = 160.0;
    } else {
      this.machineState.flow = 0;
      this.machineState.pressure = 0;
    }
  }
  
  async uploadProfile(profile: Profile): Promise<void> {
    console.log(`Mock uploading profile: ${profile.title}`);
  }
  
  async updateShotSettings(settings: ShotSettings): Promise<void> {
    console.log('Mock updating shot settings');
    this.shotSettings = { ...settings };
    
    // Update related machine state properties
    this.machineState.targetGroupTemperature = settings.groupTemp;
  }
  
  async setUsbCharging(enabled: boolean): Promise<void> {
    console.log(`Mock setting USB charging to ${enabled ? 'enabled' : 'disabled'}`);
    this.machineState.usbChargerEnabled = enabled;
  }
} 