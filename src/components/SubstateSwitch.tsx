import React from 'react'
import TextSwitch from '$/components/TextSwitch'
import { ConnectionPhase } from '$/shared/types'
import { useConnectionPhase, useMachineState } from '$/stores/data'
import { useUiStore } from '$/stores/ui'
import { useIsMachineModeActive } from '$/hooks'

// Define a custom state that's not part of regular machine states
enum CustomState {
    Running = 'running',
    PreInfuse = 'espresso.preinfusion',
    Pour = 'espresso.pour',
    Steaming = 'steam.steaming',
    WarmingUp = 'warming',
    Stabilizing = 'stabilizing',
    Flushing = 'flush',
}

export default function SubstateSwitch() {
    const machineState = useMachineState()
    const { machineMode } = useUiStore()
    const connPhase = useConnectionPhase()
    const activeMode = useIsMachineModeActive()
    
    // Get the combined state key
    const stateKey = machineState?.substate ? 
        `${machineState.state}.${machineState.substate}` : 
        machineState?.state || '';
    
    // Determine what value to show based on mode and connection
    const value = String(machineMode) === 'Server' 
        ? connPhase 
        : (activeMode ? stateKey : undefined)

    return (
        <TextSwitch
            items={[
                [CustomState.Steaming, 'Steaming'],
                [CustomState.WarmingUp, 'Warming up'],
                [CustomState.Stabilizing, 'Stabilizing'],
                [CustomState.PreInfuse, 'Preinfuse'],
                [CustomState.Pour, 'Pouring'],
                [CustomState.Flushing, 'Flushing'],
                [ConnectionPhase.WaitingToReconnect, 'Waiting'],
                [ConnectionPhase.ConnectingAdapters, 'Connecting'],
                [ConnectionPhase.Irrelevant, 'Connected'],
            ]}
            value={value}
        />
    )
}
