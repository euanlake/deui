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
  // R1 expects v2 JSON profile format
  const updatedProfile = {
    ...profile,
    version: profile.version || '2.0',
    beverage_type: profile.beverage_type || 'espresso',
    author: profile.author || 'App User',
    
    // Make sure steps have the required fields
    steps: (profile.steps || []).map(step => ({
      ...step,
      type: step.type || 'pressure',
      value: step.value || 0,
      duration: step.duration || 0
    }))
  };
  
  // Strip any fields that aren't part of the R1 API spec
  const { id, ...r1Profile } = updatedProfile;
  
  return r1Profile;
}

/**
 * Transform R1 profile data to our application's Profile format
 */
export function transformR1ProfileToProfile(r1Profile: any): Profile {
  if (!r1Profile) {
    throw new Error('Invalid profile data received from R1');
  }
  
  return {
    id: r1Profile.id || undefined,
    version: r1Profile.version || '2.0',
    title: r1Profile.title || 'Unnamed Profile',
    notes: r1Profile.notes,
    author: r1Profile.author || 'Unknown',
    beverage_type: r1Profile.beverage_type || 'espresso',
    
    // Ensure steps are properly formatted
    steps: Array.isArray(r1Profile.steps) 
      ? r1Profile.steps.map((step: any) => ({
          type: step.type || 'pressure',
          name: step.name,
          value: parseFloat(step.value) || 0,
          duration: parseFloat(step.duration) || 0,
          temperature: step.temperature ? parseFloat(step.temperature) : undefined,
          exit_condition: step.exit_condition,
          exit_value: step.exit_value ? parseFloat(step.exit_value) : undefined,
          exit_if_above: step.exit_if_above,
          start_value: step.start_value ? parseFloat(step.start_value) : undefined,
          transition_type: step.transition_type
        }))
      : [],
    
    target_volume: r1Profile.target_volume ? parseFloat(r1Profile.target_volume) : undefined,
    target_weight: r1Profile.target_weight ? parseFloat(r1Profile.target_weight) : undefined,
    target_volume_count_start: r1Profile.target_volume_count_start ? 
      parseFloat(r1Profile.target_volume_count_start) : undefined,
    tank_temperature: r1Profile.tank_temperature ? parseFloat(r1Profile.tank_temperature) : undefined,
    
    // Additional v2 fields
    lang: r1Profile.lang,
    created_at: r1Profile.created_at,
    modified_at: r1Profile.modified_at,
    reference_file: r1Profile.reference_file,
    metadata: r1Profile.metadata
  };
} 