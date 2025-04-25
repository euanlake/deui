import React, { useState, useEffect } from 'react'
import { Status } from '../StatusIndicator'
import Toggle from '../Toggle'
import { useMachineState } from '$/stores/data'
import { useMachineStateToggle } from '$/utils/machineStateToggle'

const labels = ['Sleep', 'On']

function useStatus() {
    const machineState = useMachineState()

    if (!machineState) {
        return Status.Idle
    }

    // Add logging to debug the machine state
    console.log('Machine state in PowerToggle:', machineState)

    // Check if machine is sleeping
    // Handle both 'sleep' and 'sleeping@api_v1.md' values
    if (machineState.state === 'sleep' || 
        machineState.state === 'sleeping@api_v1.md' || 
        machineState.state.startsWith('sleep')) {
        return Status.Off
    } else {
        return Status.On
    }
}

export default function PowerToggle() {
    const status = useStatus()
    const machineState = useMachineState()
    const { toggleMachineOnOff } = useMachineStateToggle()
    const [isToggling, setIsToggling] = useState(false)

    // Debug status in component
    useEffect(() => {
        console.log('PowerToggle status:', status, 'Machine state:', machineState?.state)
    }, [status, machineState])

    // Determine the displayed state, accounting for the transition period
    const displayStatus = isToggling ? Status.Busy : status

    return (
        <Toggle
            status={displayStatus}
            labels={labels}
            value={displayStatus !== Status.Off} // On when not Off
            reverse
            onChange={async () => {
                // Only toggle if we have a valid state and not already toggling
                if (machineState && !isToggling) {
                    try {
                        setIsToggling(true); // Show busy/transition state
                        await toggleMachineOnOff(machineState);
                        
                        // After toggling, the machine state will be updated through the websocket
                        // We'll keep the busy state for a short time to show the transition
                        setTimeout(() => {
                            setIsToggling(false);
                        }, 1000); // Show transition for 1 second
                    } catch (e) {
                        console.warn('Failed to toggle machine state', e);
                        setIsToggling(false); // Reset on error
                    }
                } else if (isToggling) {
                    console.log('Already toggling machine state, please wait');
                } else {
                    console.warn('Cannot toggle machine state: unknown current state');
                }
            }}
        />
    )
}
