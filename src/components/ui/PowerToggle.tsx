import React, { useState } from 'react'
import { MajorState } from '$/shared/types'
import { Status } from '../StatusIndicator'
import Toggle from '../Toggle'
import { useMajorState } from '$/stores/data'
import { useMachineStateToggle } from '$/utils/machineStateToggle'

const labels = ['Sleep', 'On']

function useStatus() {
    const majorState = useMajorState()

    if (typeof majorState === 'undefined') {
        return Status.Idle
    }

    switch (majorState) {
        case MajorState.Sleep:
            return Status.Off
        case MajorState.Idle:
            return Status.On
        default:
            return Status.On
    }
}

export default function PowerToggle() {
    const status = useStatus()
    const majorState = useMajorState()
    const { toggleMachineOnOff } = useMachineStateToggle()
    const [isToggling, setIsToggling] = useState(false)

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
                if (typeof majorState !== 'undefined' && !isToggling) {
                    try {
                        setIsToggling(true); // Show busy/transition state
                        await toggleMachineOnOff(majorState);
                        
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
