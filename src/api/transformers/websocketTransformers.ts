import { MachineState } from '../models/Machine';
import { ScaleSnapshot } from '../models/Scale';

/**
 * Transform R1 machine snapshot data to our application's MachineState format
 */
export function transformR1MachineSnapshotToMachineState(r1Data: any): MachineState {
  // R1 sends full snapshot objects in its WebSocket messages
  return {
    timestamp: r1Data.timestamp,
    state: r1Data.state.state,
    substate: r1Data.state.substate,
    flow: r1Data.flow,
    pressure: r1Data.pressure,
    targetFlow: r1Data.targetFlow,
    targetPressure: r1Data.targetPressure,
    mixTemperature: r1Data.mixTemperature,
    groupTemperature: r1Data.groupTemperature,
    targetMixTemperature: r1Data.targetMixTemperature,
    targetGroupTemperature: r1Data.targetGroupTemperature,
    profileFrame: r1Data.profileFrame,
    steamTemperature: r1Data.steamTemperature,
    usbChargerEnabled: false // Not available in real-time stream, we'll need to use the REST API to get this
  };
}

/**
 * Transform R1 scale snapshot data to our application's ScaleSnapshot format
 */
export function transformR1ScaleSnapshotToScale(r1Data: any): ScaleSnapshot {
  return {
    timestamp: r1Data.timestamp,
    weight: r1Data.weight,
    batteryLevel: r1Data.batteryLevel || 0 // Default to 0 if not provided
  };
}

/**
 * Transform R1 shot settings data to our application's format
 */
export function transformR1ShotSettingsToShotSettings(r1Data: any): any {
  return {
    steamSetting: r1Data.steamSetting,
    targetSteamTemp: r1Data.targetSteamTemp,
    targetSteamDuration: r1Data.targetSteamDuration,
    targetHotWaterTemp: r1Data.targetHotWaterTemp,
    targetHotWaterVolume: r1Data.targetHotWaterVolume,
    targetHotWaterDuration: r1Data.targetHotWaterDuration,
    targetShotVolume: r1Data.targetShotVolume,
    groupTemp: r1Data.groupTemp
  };
}

/**
 * Transform R1 water levels data to our application's format
 */
export function transformR1WaterLevelsToWaterLevels(r1Data: any): any {
  return {
    currentPercentage: r1Data.currentPercentage,
    warningThresholdPercentage: r1Data.warningThresholdPercentage
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