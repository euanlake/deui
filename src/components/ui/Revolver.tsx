import React, { ButtonHTMLAttributes, useEffect, useState } from 'react'
import { useStatus, useMachineState } from '$/stores/data'
import { MachineMode } from '$/shared/types'
import { css } from '@emotion/react'
import { useSwipeable } from 'react-swipeable'
import tw from 'twin.macro'
import { machineModeLineup, useUiStore } from '$/stores/ui'
import SubstateSwitch from '../SubstateSwitch'
import StatusIndicator, { Status } from '../StatusIndicator'

interface ItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    mode: MachineMode | "Server"
    active?: boolean
}

function Item({ mode, active = false, ...props }: ItemProps) {
    const [transitions, setTransitions] = useState(false)

    useEffect(() => void setTransitions(true), [])

    return (
        <button
            {...props}
            type="button"
            css={[
                css`
                    -webkit-tap-highlight-color: transparent;
                `,
                tw`
                    appearance-none
                    outline-none
                    items-center
                    absolute
                    px-10
                    flex
                    text-left
                    h-[70px]
                    w-full
                    top-0
                    left-0
                    font-medium
                    select-none
                    text-light-grey
                    dark:text-medium-grey
                    `,
                transitions &&
                    tw`
                        transition-colors
                        delay-100
                    `,
                active &&
                    tw`
                        text-dark-grey
                        dark:text-lighter-grey
                    `,
                transitions && active && tw`delay-500`,
            ]}
        >
            {mode}
        </button>
    )
}

const n = machineModeLineup.length

const limit = 500

function getMode(phase: number): MachineMode | "Server" {
    return machineModeLineup[((phase % n) + n) % n] || MachineMode.Espresso
}

export default function Revolver() {
    const status = useStatus()

    const { setMachineMode, machineMode } = useUiStore()

    const [phase, setPhase] = useState(machineModeLineup.indexOf(machineMode))

    const handlers = useSwipeable({
        trackTouch: true,
        onSwipedUp() {
            setPhase((current) => current + 1)
        },
        onSwipedDown() {
            setPhase((current) => current - 1)
        },
    })

    useEffect(() => {
        const to = machineModeLineup.indexOf(machineMode)

        setPhase((c) => {
            const from = (n + (c % n)) % n

            const right = (to - from + n) % n

            const left = (to - from - n) % n

            const absRight = Math.abs(right)

            const absLeft = Math.abs(left)

            return (
                c +
                (absLeft === absRight ? (c <= 0 ? right : left) : absRight < absLeft ? right : left)
            )
        })
    }, [machineMode])

    const machineState = useMachineState()

    useEffect(() => {
        if (!machineState) return;
        
        // Map the machine state to appropriate machine mode
        let newMode: MachineMode | undefined;
        
        switch(machineState.state) {
            case 'steam':
                newMode = MachineMode.Steam;
                break;
            case 'hotwater':
                newMode = MachineMode.Water;
                break;
            case 'flush':
                newMode = MachineMode.Flush;
                break;
            case 'espresso':
                newMode = MachineMode.Espresso;
                break;
            default:
                // For idle, sleep, or other states, don't change the mode
                return;
        }

        setMachineMode(newMode);
    }, [machineState, setMachineMode])

    return (
        <div
            css={tw`
                    h-full
                    relative
                `}
        >
            <StatusIndicator value={String(machineMode) === 'Server' ? status : Status.None} />
            <div
                css={tw`
                        absolute
                        left-1/2
                        top-1/2
                        -translate-y-1/2
                        pointer-events-none
                        dark:text-medium-grey
                        text-[1.75rem]
                        font-medium
                    `}
            >
                <SubstateSwitch />
            </div>
            <div
                {...handlers}
                css={tw`
                        h-full
                        overflow-hidden
                        text-white
                        text-[1.75rem]
                        relative
                    `}
            >
                <div
                    style={{
                        transform: `translateY(${(144 - 70) / 2}px) translateY(${-phase * 70}px)`,
                    }}
                    css={tw`
                            transition-transform
                            duration-500
                        `}
                >
                    {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(
                        (i) =>
                            Math.abs(phase + i) < limit && (
                                <Item
                                    onClick={() => {
                                        setMachineMode(getMode(phase + i))
                                    }}
                                    active={!i}
                                    key={phase + i}
                                    mode={getMode(phase + i)}
                                    style={{
                                        top: `${(phase + i) * 70}px`,
                                    }}
                                />
                            )
                    )}
                </div>
            </div>
        </div>
    )
}