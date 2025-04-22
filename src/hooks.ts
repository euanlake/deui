import { useMajorState } from '$/stores/data'
import { useUiStore } from '$/stores/ui'
import { MachineMode, MajorState, Period, Time } from '$/shared/types'
import { useEffect, useState } from 'react'
import { Metrics, VerticalMetrics } from '$/components/Metric'
import { useSearchParams } from 'react-router-dom'

export function useIsMachineModeActive() {
    const majorState = useMajorState()

    switch (useUiStore().machineMode) {
        case MachineMode.Espresso:
            return majorState === MajorState.Espresso
        case MachineMode.Flush:
            return majorState === MajorState.HotWaterRinse
        case MachineMode.Steam:
            return majorState === MajorState.Steam
        case MachineMode.Water:
            return majorState === MajorState.HotWater
        default:
    }

    return false
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
    return [...(verticalLayout ? VerticalMetrics : Metrics)[machineMode]]
}

export function useServerUrl({ 
    protocol = 'http'
} = {}) {
    const [params] = useSearchParams()

    // Get hostname from URL params, stored preferences, or default to current hostname
    const preferredHostname = localStorage.getItem('r1_hostname')
    const hostname = params.get('h') || preferredHostname || 'localhost'
    
    // Get port from URL params or use default (R1 typically uses port 8443)
    const defaultPort = 8443
    const port = Number(params.get('p') || defaultPort)

    // Construct the URL
    const serverUrl = `${protocol}://${hostname}:${port}`
    
    // Store the hostname for future use
    useEffect(() => {
        if (hostname !== 'localhost' && hostname !== location.hostname) {
            localStorage.setItem('r1_hostname', hostname)
        }
    }, [hostname])

    return serverUrl
}

/**
 * Hook for checking R1 connection status
 * @returns {boolean} true if R1 is available at configured URL
 */
export function useR1Availability() {
    const serverUrl = useServerUrl({ useR1Api: true })
    const [isAvailable, setIsAvailable] = useState(false)
    
    useEffect(() => {
        const checkAvailability = async () => {
            try {
                // Use a simple HEAD request to check if R1 is responding
                await fetch(`${serverUrl}/api/v1/devices`, { 
                    method: 'HEAD',
                    // Short timeout to avoid long waits
                    signal: AbortSignal.timeout(1500)
                })
                setIsAvailable(true)
            } catch (e) {
                setIsAvailable(false)
            }
        }
        
        checkAvailability()
        
        // Periodic check for availability
        const interval = setInterval(checkAvailability, 10000)
        return () => clearInterval(interval)
    }, [serverUrl])
    
    return isAvailable
}

/**
 * Hook for determining which API to use
 * @returns {boolean} true if should use R1 API, false for legacy API
 */
export function useShouldUseR1Api() {
    const isR1Available = useR1Availability()
    // Force R1 usage from URL param if specified
    const [params] = useSearchParams()
    const forceR1 = params.get('useR1') === 'true'
    
    // Use R1 if explicitly enabled via env var + available, or forced via URL
    return (process.env.USE_R1_API === 'true' && isR1Available) || forceR1
}
