import { MachineState, Profile, ShotSettings } from '../models/Machine';

export function transformR1MachineStateToMachineState(r1State: any): MachineState {
  return {
    timestamp: r1State.snapshot.timestamp,
    state: r1State.snapshot.state.state,
    substate: r1State.snapshot.state.substate,
    flow: r1State.snapshot.flow,
    pressure: r1State.snapshot.pressure,
    targetFlow: r1State.snapshot.targetFlow,
    targetPressure: r1State.snapshot.targetPressure,
    mixTemperature: r1State.snapshot.mixTemperature,
    groupTemperature: r1State.snapshot.groupTemperature,
    targetMixTemperature: r1State.snapshot.targetMixTemperature,
    targetGroupTemperature: r1State.snapshot.targetGroupTemperature,
    profileFrame: r1State.snapshot.profileFrame,
    steamTemperature: r1State.snapshot.steamTemperature,
    usbChargerEnabled: r1State.usbChargerEnabled
  };
}

export function transformProfileToR1Profile(profile: Profile): any {
  // Simple passthrough as R1 supports v2 json profiles
  return profile;
}

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

export function transformR1ScaleSnapshotToScaleSnapshot(r1Snapshot: any): any {
  return {
    timestamp: r1Snapshot.timestamp,
    weight: r1Snapshot.weight,
    batteryLevel: r1Snapshot.batteryLevel
  };
} 