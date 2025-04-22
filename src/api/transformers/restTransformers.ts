import { Device } from '../models/Device';
import { MachineState, Profile, ShotSettings } from '../models/Machine';
import { Scale } from '../models/Scale';

/**
 * Transform R1 device data to our application's Device format
 */
export function transformR1DeviceToDevice(r1Device: any): Device {
  return {
    id: r1Device.id,
    name: r1Device.name,
    connectionState: r1Device.state === 'connected' ? 'connected' : 'disconnected',
    type: r1Device.name.toLowerCase().includes('scale') ? 'scale' : 'machine'
  };
}

/**
 * Transform R1 machine state data to our application's MachineState format
 */
export function transformR1MachineStateToMachineState(r1Data: any): MachineState {
  const { snapshot, usbChargerEnabled } = r1Data;
  
  return {
    timestamp: snapshot.timestamp,
    state: snapshot.state.state,
    substate: snapshot.state.substate,
    flow: snapshot.flow,
    pressure: snapshot.pressure,
    targetFlow: snapshot.targetFlow,
    targetPressure: snapshot.targetPressure,
    mixTemperature: snapshot.mixTemperature,
    groupTemperature: snapshot.groupTemperature,
    targetMixTemperature: snapshot.targetMixTemperature,
    targetGroupTemperature: snapshot.targetGroupTemperature,
    profileFrame: snapshot.profileFrame,
    steamTemperature: snapshot.steamTemperature,
    usbChargerEnabled: usbChargerEnabled || false
  };
}

/**
 * Transform R1 scale data to our application's Scale format
 */
export function transformR1ScaleToScale(r1Scale: any): Scale {
  return {
    id: r1Scale.id,
    name: r1Scale.name,
    batteryLevel: r1Scale.batteryLevel || 0,
    connectionState: r1Scale.state === 'connected' ? 'connected' : 'disconnected',
    type: 'scale'
  };
}

/**
 * Transform R1 shot settings to our application's ShotSettings format
 */
export function transformR1ShotSettingsToShotSettings(r1Settings: any): ShotSettings {
  return {
    steamSetting: r1Settings.steamSetting,
    targetSteamTemp: r1Settings.targetSteamTemp,
    targetSteamDuration: r1Settings.targetSteamDuration,
    targetHotWaterTemp: r1Settings.targetHotWaterTemp,
    targetHotWaterVolume: r1Settings.targetHotWaterVolume,
    targetHotWaterDuration: r1Settings.targetHotWaterDuration,
    targetShotVolume: r1Settings.targetShotVolume,
    groupTemp: r1Settings.groupTemp
  };
}

/**
 * Transform our application's ShotSettings to R1 format
 */
export function transformShotSettingsToR1ShotSettings(settings: ShotSettings): any {
  return {
    steamSetting: settings.steamSetting,
    targetSteamTemp: settings.targetSteamTemp,
    targetSteamDuration: settings.targetSteamDuration,
    targetHotWaterTemp: settings.targetHotWaterTemp,
    targetHotWaterVolume: settings.targetHotWaterVolume,
    targetHotWaterDuration: settings.targetHotWaterDuration,
    targetShotVolume: settings.targetShotVolume,
    groupTemp: settings.groupTemp
  };
}

/**
 * Transform our application's Profile to R1 format
 */
export function transformProfileToR1Profile(profile: Profile): any {
  // R1 expects specific profile format
  return {
    ...profile
    // No additional transformation needed if our Profile model already matches R1's expectations
  };
} 