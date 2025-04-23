import { MachineState, ShotSettings } from '../../api/models/Machine'
import { ScaleSnapshot } from '../../api/models/Scale'
import { Prop } from '$/shared/types'
import { MajorState, MinorState } from '../../shared/types'

// Map R1 API machine states to legacy MajorState/MinorState
const machineStateMap: Record<string, { major: MajorState, minor: MinorState }> = {
    'idle': { major: MajorState.Sleep, minor: MinorState.NoState },
    'sleeping': { major: MajorState.Sleep, minor: MinorState.NoState },
    'sleeping.idle': { major: MajorState.Sleep, minor: MinorState.NoState },
    'espresso': { major: MajorState.Espresso, minor: MinorState.NoState },
    'espresso.idle': { major: MajorState.Espresso, minor: MinorState.NoState },
    'espresso.preinfusion': { major: MajorState.Espresso, minor: MinorState.PreInfuse },
    'espresso.pour': { major: MajorState.Espresso, minor: MinorState.Pour },
    'steam': { major: MajorState.Steam, minor: MinorState.Pour },
    'steam.idle': { major: MajorState.Steam, minor: MinorState.NoState },
    'steam.steaming': { major: MajorState.Steam, minor: MinorState.Steaming },
    'water': { major: MajorState.HotWater, minor: MinorState.Pour },
    'water.idle': { major: MajorState.HotWater, minor: MinorState.NoState },
    'water.pouring': { major: MajorState.HotWater, minor: MinorState.Pour },
    'flush': { major: MajorState.HotWaterRinse, minor: MinorState.Flush }
}

export function machineStateToProperties(machineState: MachineState | null): Partial<Record<Prop, any>> {
    if (!machineState) return {}
    
    console.log('Raw machine snapshot data:', JSON.stringify(machineState))
    console.log('targetGroupTemperature:', machineState.targetGroupTemperature)
    
    // Handle different machine state object structures
    let stateKey = '';
    
    // Handle both string and object state formats
    if (machineState.state) {
        if (typeof machineState.state === 'string') {
            // Simple state string
            stateKey = machineState.state;
            
            // Add substate if available
            if (machineState.substate) {
                stateKey = `${machineState.state}.${machineState.substate}`;
            }
        } else if (typeof machineState.state === 'object' && machineState.state !== null) {
            // Complex state object with nested state properties
            const stateObj = machineState.state as any;
            if (stateObj.state) {
                stateKey = stateObj.state;
                
                // Add substate if available
                if (stateObj.substate) {
                    stateKey = `${stateObj.state}.${stateObj.substate}`;
                }
            }
        }
    }
    
    // Map R1 API machine state to appropriate MajorState/MinorState
    // This is critical for both UI displays and the power button functionality
    let majorState = MajorState.Sleep; // Default to Sleep
    let minorState = MinorState.NoState;
    
    if (stateKey.includes('idle') || stateKey === 'idle') {
        // If the state contains "idle", map to MajorState.Idle instead of Sleep
        // This ensures the power button shows as "On" (green) when the machine is idle
        majorState = MajorState.Idle;
        minorState = MinorState.NoState;
    } else {
        // Use the mapping table for other states
        const mapping = machineStateMap[stateKey];
        if (mapping) {
            majorState = mapping.major;
            minorState = mapping.minor;
        } else if (stateKey.includes('espresso')) {
            majorState = MajorState.Espresso;
            minorState = MinorState.NoState;
        } else if (stateKey.includes('steam')) {
            majorState = MajorState.Steam;
            minorState = MinorState.NoState;
        } else if (stateKey.includes('water')) {
            majorState = MajorState.HotWater;
            minorState = MinorState.NoState;
        } else if (stateKey.includes('sleeping') || stateKey === 'sleeping') {
            majorState = MajorState.Sleep;
            minorState = MinorState.NoState;
        }
    }
    
    // Determine if we're in a state where we should display flow/pressure
    const isActiveState = (
        majorState === MajorState.Espresso ||
        majorState === MajorState.Steam ||
        majorState === MajorState.HotWater
    );
    
    // Extract values with proper default handling
    const pressure = typeof machineState.pressure === 'number' ? machineState.pressure : 0;
    const flow = typeof machineState.flow === 'number' ? machineState.flow : 0;
    const targetPressure = typeof machineState.targetPressure === 'number' ? machineState.targetPressure : 0;
    const targetFlow = typeof machineState.targetFlow === 'number' ? machineState.targetFlow : 0;
    const targetGroupTemp = typeof machineState.targetGroupTemperature === 'number' ? machineState.targetGroupTemperature : 0;
    
    // Add a timestamp to force UI updates when new data arrives
    const timestamp = Date.now();
    
    const result: Partial<Record<Prop, any>> = {
        // Set machine state - CRITICAL for power button functionality
        [Prop.MajorState]: majorState,
        [Prop.MinorState]: minorState,
        
        // Set temperature values - these must be set for proper UI display
        [Prop.GroupHeater]: machineState.groupTemperature || 0,
        [Prop.TargetGroupHeater]: machineState.targetGroupTemperature || 0,
        [Prop.WaterHeater]: machineState.mixTemperature || 0, // Map mix temp to water heater
        [Prop.TargetWaterHeater]: machineState.targetMixTemperature || 0,
        [Prop.ColdWater]: machineState.mixTemperature || 0,
        [Prop.TargetColdWater]: machineState.targetMixTemperature || 0,
        [Prop.SteamHeater]: machineState.steamTemperature || 0,
        [Prop.TargetSteamHeater]: machineState.targetMixTemperature || 0, // No direct mapping, use mix temp
        
        // Set shot sample data - these must be set for internal calculations
        [Prop.ShotGroupFlow]: flow,
        [Prop.ShotGroupPressure]: pressure,
        
        // Flow and Pressure values for direct UI display - CRITICALLY IMPORTANT
        [Prop.Pressure]: pressure, // Main pressure display value
        [Prop.Flow]: flow, // Main flow display value
        
        // Set shot settings
        [Prop.ShotSetGroupFlow]: targetFlow,
        [Prop.ShotSetGroupPressure]: targetPressure,
        [Prop.ShotFrameNumber]: machineState.profileFrame || 0,
        
        // Set temperature info for shot display
        [Prop.ShotMixTemp]: machineState.mixTemperature || 0,
        [Prop.ShotHeadTemp]: machineState.groupTemperature || 0,
        [Prop.ShotSetMixTemp]: machineState.targetMixTemperature || 0,
        [Prop.ShotSetHeadTemp]: machineState.targetGroupTemperature || 0,
        
        // CRITICAL: Set the TargetGroupTemp explicitly to ensure "Goal Temp" displays
        // Used by the UI to display the target temperature in the Espresso tab
        [Prop.TargetGroupTemp]: targetGroupTemp,
        
        // Add timestamp to ensure UI updates are triggered
        [Prop.ShotSampleTime]: timestamp,
        
        // Water level defaults (safe fallbacks)
        [Prop.WaterCapacity]: 1500, // 1.5L default tank capacity
        [Prop.WaterLevel]: 0.8     // Default to 80% if not provided by API
    }
    
    // Track max flow and pressure when in espresso mode
    if (majorState === MajorState.Espresso) {
        if (pressure > 0) {
            result[Prop.RecentEspressoMaxPressure] = pressure;
        }
        if (flow > 0) {
            result[Prop.RecentEspressoMaxFlow] = flow;
        }
    }
    
    console.log('Transformed data (machine)', result)
    return result
}

export function scaleSnapshotToProperties(scaleSnapshot: ScaleSnapshot | null): Partial<Record<Prop, any>> {
    if (!scaleSnapshot) return {}
    
    console.log('Scale snapshot data:', scaleSnapshot);
    
    // Currently, there is no direct weight property in the Prop enum
    // This is a placeholder for future implementation
    return {}
}

export function shotSettingsToProperties(shotSettings: ShotSettings | null): Partial<Record<Prop, any>> {
    if (!shotSettings) return {}
    
    console.log('Shot settings data:', JSON.stringify(shotSettings))
    console.log('groupTemp:', shotSettings.groupTemp)
    
    return {
        [Prop.TargetEspressoVol]: shotSettings.targetShotVolume || 0,
        [Prop.TargetGroupTemp]: shotSettings.groupTemp || 0,
        [Prop.SteamSettings]: shotSettings.steamSetting || 0,
        [Prop.TargetSteamTemp]: shotSettings.targetSteamTemp || 0,
        [Prop.TargetSteamLength]: shotSettings.targetSteamDuration || 0,
        [Prop.TargetHotWaterTemp]: shotSettings.targetHotWaterTemp || 0,
        [Prop.TargetHotWaterVol]: shotSettings.targetHotWaterVolume || 0,
        [Prop.TargetHotWaterLength]: shotSettings.targetHotWaterDuration || 0
    }
}

export function waterLevelsToProperties(waterLevels: { currentPercentage: number; warningThresholdPercentage: number } | null): Partial<Record<Prop, any>> {
    if (!waterLevels) return {}
    
    console.log('Water levels data:', waterLevels);
    
    // Add timestamp to ensure UI updates are triggered
    const timestamp = Date.now();
    
    return {
        [Prop.WaterLevel]: waterLevels.currentPercentage / 100, // Convert percentage to 0-1 range
        [Prop.ShotSampleTime]: timestamp // Force UI update with timestamp
    }
}

export function connectionStatusToRemoteState(connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'): Record<string, any> {
    switch (connectionStatus) {
        case 'connected':
            return { deviceReady: true }
        case 'connecting':
            return { deviceReady: false, connecting: true }
        case 'error':
        case 'disconnected':
        default:
            return { deviceReady: false }
    }
} 