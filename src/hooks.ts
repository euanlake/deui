import { useMajorState } from '$/stores/data'
import { useUiStore } from '$/stores/ui'
import { MachineMode, MajorState, Period, Time } from '$/shared/types'
import { useEffect, useState } from 'react'
import { Metrics, VerticalMetrics } from '$/components/Metric'
import { useSearchParams } from 'react-router-dom'
import { useDataStore } from '$/stores/data'
import { useMachineState } from '$/stores/data'

export function useIsMachineModeActive() {
    const machineState = useMachineState()
    const { machineMode } = useUiStore()
    
    if (!machineState) return false
    
    // Compare the machine mode with the current machine state
    switch (machineMode) {
        case MachineMode.Espresso:
            return machineState.state === 'espresso'
        case MachineMode.Flush:
            return machineState.state === 'flush'
        case MachineMode.Steam:
            return machineState.state === 'steam'
        case MachineMode.Water:
            return machineState.state === 'hotwater'
        default:
            return false
    }
}

export function useCurrentTime() {
    const [time, setTime] = useState<Time>()

    useEffect(() => {
        let mounted = true

        let recentTime: string

        let timeout: number | undefined

        function tick() {
            const newTime = new Date().toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
            })

            if (!mounted) {
                return
            }

            if (recentTime !== newTime) {
                recentTime = newTime

                const [, hour = '', minute = '', period = Period.Am] =
                    newTime.toLowerCase().match(/^(\d+):(\d+) (am|pm)$/i) || []

                setTime({
                    period: period as Period,
                    hour,
                    minute,
                })
            }

            timeout = window.setTimeout(tick, 1000)
        }

        tick()

        return () => {
            if (timeout) {
                clearTimeout(timeout)
                timeout = undefined
            }

            mounted = false
        }
    }, [])

    return time
}

export function useMetrics({ verticalLayout }: { verticalLayout?: boolean } = {}) {
    const { machineMode } = useUiStore()
    const metricsMap = verticalLayout ? VerticalMetrics : Metrics
    
    // Check if the machineMode exists in the metrics map
    // If not, default to Espresso mode metrics or return an empty array
    if (!metricsMap[machineMode as keyof typeof metricsMap]) {
        // Return an empty array when in Server mode
        if (String(machineMode) === 'Server') {
            return []
        }
        // Default to Espresso metrics for unknown modes
        return [...metricsMap[MachineMode.Espresso]]
    }
    
    return [...metricsMap[machineMode as keyof typeof metricsMap]]
}
