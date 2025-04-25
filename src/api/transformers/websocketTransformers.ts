import { MachineState } from '../models/Machine';
import { ScaleSnapshot } from '../models/Scale';

/**
 * Transform R1 machine snapshot data to our application's MachineState format
 */
export function transformR1MachineSnapshotToMachineState(r1Data: any): MachineState {
  // Handle state and substate normalization for different formats
  let state = 'unknown';
  let substate = 'unknown';
  
  // Extract state from the nested structure
  if (r1Data.state) {
    if (typeof r1Data.state === 'string') {
      state = r1Data.state;
    } else if (typeof r1Data.state === 'object' && r1Data.state !== null) {
      state = r1Data.state.state || 'unknown';
      substate = r1Data.state.substate || 'unknown';
    }
  }
  
  // If the substate comes directly in the root object
  if (r1Data.substate && typeof r1Data.substate === 'string') {
    substate = r1Data.substate;
  }
  
  // Normalize preinfusion variants (API might use either spelling)
  if (substate === 'preinfusion' || substate === 'preinfuse') {
    substate = 'preinfusion';
  }
  
  return {
    timestamp: r1Data.timestamp || new Date().toISOString(),
    state: state,
    substate: substate,
    flow: Number(r1Data.flow || 0),
    pressure: Number(r1Data.pressure || 0),
    targetFlow: Number(r1Data.targetFlow || 0),
    targetPressure: Number(r1Data.targetPressure || 0),
    mixTemperature: Number(r1Data.mixTemperature || 0),
    groupTemperature: Number(r1Data.groupTemperature || 0),
    targetMixTemperature: Number(r1Data.targetMixTemperature || 0),
    targetGroupTemperature: Number(r1Data.targetGroupTemperature || 0),
    profileFrame: Number(r1Data.profileFrame || 0),
    steamTemperature: Number(r1Data.steamTemperature || 0),
    usbChargerEnabled: Boolean(r1Data.usbChargerEnabled || false)
  };
}

/**
 * Transform R1 scale snapshot data to our application's ScaleSnapshot format
 */
export function transformR1ScaleSnapshotToScale(r1Data: any): ScaleSnapshot {
  return {
    timestamp: r1Data.timestamp || new Date().toISOString(),
    weight: Number(r1Data.weight || 0),
    batteryLevel: Number(r1Data.batteryLevel || 0)
  };
}

/**
 * Transform R1 shot settings data to our application's format
 */
export function transformR1ShotSettingsToShotSettings(r1Data: any): any {
  return {
    steamSetting: Number(r1Data.steamSetting || 0),
    targetSteamTemp: Number(r1Data.targetSteamTemp || 0),
    targetSteamDuration: Number(r1Data.targetSteamDuration || 0),
    targetHotWaterTemp: Number(r1Data.targetHotWaterTemp || 0),
    targetHotWaterVolume: Number(r1Data.targetHotWaterVolume || 0),
    targetHotWaterDuration: Number(r1Data.targetHotWaterDuration || 0),
    targetShotVolume: Number(r1Data.targetShotVolume || 0),
    groupTemp: Number(r1Data.groupTemp || 0)
  };
}

/**
 * Transform R1 water levels data to our application's format
 */
export function transformR1WaterLevelsToWaterLevels(r1Data: any): any {
  return {
    currentPercentage: Number(r1Data.currentPercentage || 0),
    warningThresholdPercentage: Number(r1Data.warningThresholdPercentage || 0)
  };
}

/**
 * General purpose data transformation function that selects the appropriate 
 * transformer based on the WebSocket endpoint
 */
export function transformR1WebSocketData(
  endpoint: 'machine' | 'scale' | 'shotSettings' | 'waterLevels', 
  data: any
): any {
  switch (endpoint) {
    case 'machine':
      return transformR1MachineSnapshotToMachineState(data);
    case 'scale':
      return transformR1ScaleSnapshotToScale(data);
    case 'shotSettings':
      return transformR1ShotSettingsToShotSettings(data);
    case 'waterLevels':
      return transformR1WaterLevelsToWaterLevels(data);
    default:
      return data;
  }
} 