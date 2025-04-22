import { MachineState, ShotSettings } from '../models/Machine';
import { ScaleSnapshot } from '../models/Scale';
import { 
  MajorState, 
  MinorState, 
  Properties, 
  Prop, 
  RemoteState 
} from '../../shared/types';

/**
 * Convert R1 machine state to app properties format
 * This maintains backward compatibility with existing hooks
 */
export function machineStateToProperties(machineState: MachineState | null): Partial<Properties> {
  if (!machineState) return {};
  
  const properties: Partial<Properties> = {};
  
  // Map state values
  if (machineState.state) {
    properties[Prop.MajorState] = convertR1StateToMajorState(machineState.state);
  }
  
  if (machineState.substate) {
    properties[Prop.MinorState] = convertR1SubstateToMinorState(machineState.substate);
  }
  
  // Map temperature values
  properties[Prop.MixTemperature] = machineState.mixTemperature;
  properties[Prop.GroupTemperature] = machineState.groupTemperature;
  properties[Prop.TargetMixTemperature] = machineState.targetMixTemperature;
  properties[Prop.TargetGroupTemperature] = machineState.targetGroupTemperature;
  properties[Prop.SteamTemperature] = machineState.steamTemperature;
  
  // Map flow and pressure values
  properties[Prop.Flow] = machineState.flow;
  properties[Prop.Pressure] = machineState.pressure;
  properties[Prop.TargetFlow] = machineState.targetFlow;
  properties[Prop.TargetPressure] = machineState.targetPressure;
  
  return properties;
}

/**
 * Convert R1 scale snapshot to app properties format
 */
export function scaleSnapshotToProperties(scaleSnapshot: ScaleSnapshot | null): Partial<Properties> {
  if (!scaleSnapshot) return {};
  
  return {
    [Prop.ScaleWeight]: scaleSnapshot.weight
  };
}

/**
 * Convert R1 shot settings to app properties format
 */
export function shotSettingsToProperties(shotSettings: ShotSettings | null): Partial<Properties> {
  if (!shotSettings) return {};
  
  return {
    [Prop.SteamSettings]: shotSettings.steamSetting,
    [Prop.TargetSteamTemp]: shotSettings.targetSteamTemp,
    [Prop.TargetSteamLength]: shotSettings.targetSteamDuration,
    [Prop.TargetHotWaterTemp]: shotSettings.targetHotWaterTemp,
    [Prop.TargetHotWaterVol]: shotSettings.targetHotWaterVolume,
    [Prop.TargetHotWaterLength]: shotSettings.targetHotWaterDuration,
    [Prop.TargetEspressoVol]: shotSettings.targetShotVolume,
    [Prop.TargetGroupTemp]: shotSettings.groupTemp
  };
}

/**
 * Convert water levels to app properties format
 */
export function waterLevelsToProperties(
  waterLevels: { currentPercentage: number; warningThresholdPercentage: number } | null
): Partial<Properties> {
  if (!waterLevels) return {};
  
  return {
    [Prop.WaterLevel]: waterLevels.currentPercentage / 100
  };
}

/**
 * Convert connection status to remote state
 */
export function connectionStatusToRemoteState(
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
): Partial<RemoteState> {
  switch (status) {
    case 'connected':
      return { 
        deviceReady: true,
        scanning: false,
        connecting: false,
        discoveringCharacteristics: false
      };
    case 'connecting':
      return {
        deviceReady: false,
        scanning: false,
        connecting: true,
        discoveringCharacteristics: false
      };
    case 'disconnected':
    case 'error':
    default:
      return {
        deviceReady: false,
        scanning: false,
        connecting: false,
        discoveringCharacteristics: false
      };
  }
}

/**
 * Map R1 machine states to app MajorState values
 */
function convertR1StateToMajorState(r1State: string): MajorState {
  switch (r1State.toLowerCase()) {
    case 'espresso':
      return MajorState.Espresso;
    case 'steam':
      return MajorState.Steam;
    case 'hot_water':
      return MajorState.HotWater;
    case 'idle':
      return MajorState.Idle;
    case 'sleep':
      return MajorState.Sleep;
    default:
      return MajorState.Idle;
  }
}

/**
 * Map R1 machine substates to app MinorState values
 */
function convertR1SubstateToMinorState(r1Substate: string): MinorState {
  switch (r1Substate.toLowerCase()) {
    case 'pouring':
    case 'pour':
      return MinorState.Pour;
    case 'preinfusion':
    case 'pre_infusion':
      return MinorState.Preinfusion;
    case 'heating':
      return MinorState.Heating;
    case 'flushing':
    case 'flush':
      return MinorState.Flush;
    case 'idle':
    default:
      return MinorState.Idle;
  }
} 