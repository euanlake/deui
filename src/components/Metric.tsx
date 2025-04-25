import React, { HTMLAttributes } from 'react'
import tw from 'twin.macro'
import Label from './primitives/Label'
import { 
    useMachineState, 
    useWaterLevel, 
    useScaleSnapshot, 
    useShotTime,
    useMaxFlow,
    useMaxPressure,
    useMaxWeight,
    useShotSettings
} from '$/stores/data'
import { MachineMode } from '$/shared/types'
import { useIsMachineModeActive } from '$/hooks'
import { ShotProperty } from '$/shared/r1models'

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'property'> {
    property: string | ((idle: boolean) => string)
}

function defaultFormatFn(value: number) {
    return value.toFixed(1)
}

export default function Metric({ property: propertyProp, ...props }: Props) {
    const machineState = useMachineState()
    const scaleSnapshot = useScaleSnapshot()
    const waterLevel = useWaterLevel()
    const shotTime = useShotTime()
    const maxFlow = useMaxFlow()
    const maxPressure = useMaxPressure()
    const maxWeight = useMaxWeight()
    const shotSettings = useShotSettings()

    const idle = (() => {
        // Determine if machine is in idle state based on machineState
        if (!machineState) return true;
        
        const stateKey = machineState.substate ? 
            `${machineState.state}.${machineState.substate}` : 
            machineState.state;
        
        // Not idle when in preinfusion, pour, or flushing
        if (stateKey === 'espresso.preinfusion' || 
            stateKey === 'espresso.pour' || 
            stateKey === 'flush') {
            return false;
        }
        return true;
    })()

    const property = typeof propertyProp === 'function' ? propertyProp(idle) : propertyProp

    const value = (() => {
        // Get the appropriate value based on the property
        if (!machineState) return 0
        
        switch (property) {
            case ShotProperty.Pressure:
                return machineState.pressure
            case ShotProperty.Flow:
                return machineState.flow
            case ShotProperty.GroupTemperature:
                return machineState.groupTemperature
            case ShotProperty.MixTemperature:
                return machineState.mixTemperature
            case 'weight':
                return scaleSnapshot?.weight || 0
            case 'waterLevel':
                return waterLevel
            case 'maxFlow':
                return maxFlow
            case 'maxPressure':
                return maxPressure
            case 'maxWeight':
                return maxWeight
            case 'targetGroupTemperature':
                // Use the target group temperature from machine state (ws/v1/de1/snapshot)
                return machineState.targetGroupTemperature || 0
            case 'targetSteamTemp':
                // For steam temp, use targetMixTemperature from machine state
                return machineState.targetMixTemperature || 0
            case 'targetHotWaterTemp':
                // Use shotSettings for hot water values as they're not in the machine state
                return shotSettings?.targetHotWaterTemp || 0
            case 'targetHotWaterVol':
                return shotSettings?.targetHotWaterVolume || 0
            case 'shotTime':
            case 'espressoTime':
                return shotTime
            case 'time':
                return shotTime
            default:
                return 0
        }
    })()

    const active = useIsMachineModeActive()

    const metric = propToMetricMap[property]

    if (!metric) {
        return <></>
    }

    const { label, unit, formatFn = defaultFormatFn } = metric

    return (
        <div
            {...props}
            css={[
                tw`
                    font-medium
                    select-none
                `,
            ]}
        >
            <Label css={tw`lg:justify-center`}>
                {label} {unit}
            </Label>
            <div
                css={tw`
                    lg:text-center
                    text-t2
                    lg:text-[2.5rem]
                `}
            >
                <span
                    css={[
                        tw`
                            text-light-grey
                            dark:text-medium-grey
                        `,
                        active &&
                            tw`
                                text-darker-grey
                                dark:text-lighter-grey
                            `,
                    ]}
                >
                    {formatFn(value)}
                </span>
            </div>
        </div>
    )
}

type Metrics = Record<
    MachineMode.Espresso | MachineMode.Flush | MachineMode.Steam | MachineMode.Water,
    (string | ((idle?: boolean) => string))[]
>

// Updated property to metric mapping using string keys
const propToMetricMap: Record<string, { label: string; unit: string; formatFn?: (value: number) => string }> = {
    [ShotProperty.GroupTemperature]: {
        label: 'Metal temp',
        unit: '',
    },
    ['targetGroupTemperature']: {
        label: 'Goal temp',
        unit: '',
        formatFn: (v) => `${v}`,
    },
    [ShotProperty.Pressure]: { 
        label: 'Pressure', 
        unit: '' 
    },
    [ShotProperty.Flow]: { 
        label: 'Flow', 
        unit: '' 
    },
    ['weight']: { 
        label: 'Weight', 
        unit: '', 
        formatFn: (v) => v.toFixed(1) 
    },
    ['maxPressure']: { 
        label: 'Max pressure', 
        unit: '' 
    },
    ['maxFlow']: { 
        label: 'Max flow', 
        unit: '' 
    },
    ['maxWeight']: { 
        label: 'Max weight', 
        unit: '', 
        formatFn: (v) => v.toFixed(1) 
    },
    ['shotTime']: { 
        label: 'Shot time', 
        unit: '', 
        formatFn: (v) => v.toFixed(0) 
    },
    ['espressoTime']: {
        label: 'Shot time',
        unit: '',
        formatFn: (v) => v.toFixed(0),
    },
    ['flushTime']: {
        label: 'Time',
        unit: '',
        formatFn: (v) => v.toFixed(0),
    },
    ['targetSteamTemp']: {
        label: 'Goal temp',
        unit: '',
        formatFn: (v) => `${Math.round(v)}`,
    },
    [ShotProperty.MixTemperature]: {
        label: 'Steam temp',
        unit: '',
        formatFn: (v) => `${Math.round(v)}`,
    },
    ['steamTime']: { 
        label: 'Time', 
        unit: '', 
        formatFn: (v) => v.toFixed(0) 
    },
    ['targetHotWaterTemp']: {
        label: 'Goal temp',
        unit: '',
        formatFn: (v) => v.toFixed(0),
    },
    ['targetHotWaterVol']: {
        label: 'Goal vol',
        unit: '',
        formatFn: (v) => v.toFixed(0),
    },
    ['waterTime']: {
        label: 'Time',
        unit: '',
        formatFn: (v) => v.toFixed(0),
    },
}

export const Metrics: Metrics = {
    [MachineMode.Espresso]: [
        'targetGroupTemperature',
        ShotProperty.GroupTemperature,
        (idle) => (idle ? 'maxPressure' : ShotProperty.Pressure),
        (idle) => (idle ? 'maxFlow' : ShotProperty.Flow),
        (idle) => (idle ? 'maxWeight' : 'weight'),
        (idle) => (idle ? 'shotTime' : 'espressoTime'),
    ],
    [MachineMode.Flush]: ['flushTime'],
    [MachineMode.Steam]: [
        'targetSteamTemp',
        ShotProperty.MixTemperature,
        ShotProperty.Pressure,
        ShotProperty.Flow,
        'steamTime',
    ],
    [MachineMode.Water]: [
        'targetHotWaterTemp',
        'targetHotWaterVol',
        ShotProperty.Flow,
        'weight',
        'waterTime',
    ],
}

export const VerticalMetrics: Metrics = {
    ...Metrics,
    [MachineMode.Espresso]: [
        (idle) => (idle ? 'maxPressure' : ShotProperty.Pressure),
        (idle) => (idle ? 'maxFlow' : ShotProperty.Flow),
        (idle) => (idle ? 'maxWeight' : 'weight'),
        (idle) => (idle ? 'shotTime' : 'espressoTime'),
        'targetGroupTemperature',
        ShotProperty.GroupTemperature,
    ],
}
