import Clock from '$/components/ui/Clock'
import Controller from '$/components/ui/Controller'
import WaterBar from '$/components/ui/WaterBar'
import { Layer } from '$/shared/types'
import { useDataStore, useMajorState, useWaterLevel, useScaleStatus } from '$/stores/data'
import { Prop } from '$/shared/types'
import { mlToL } from '$/utils'
import React, { HTMLAttributes, ReactNode, useState } from 'react'
import { toaster } from 'toasterhea'
import tw from 'twin.macro'
import Toolbar from './Toolbar'
import SettingsDrawer from './drawers/SettingsDrawer'
import ScaleSelectDrawer from './drawers/ScaleSelectDrawer'
import Button from './primitives/Button'
import Label from './primitives/Label'
import PowerToggle from './ui/PowerToggle'
import StatusIndicator, { Status } from './StatusIndicator'

const settingsDrawer = toaster(SettingsDrawer, Layer.Drawer)
const scaleSelectDrawer = toaster(ScaleSelectDrawer, Layer.Drawer)

export default function WideView(props: HTMLAttributes<HTMLDivElement>) {
    const { [Prop.WaterCapacity]: waterCapacity = 0 } = useDataStore().properties
    const { getScales, selectedScale, selectScale, scanForDevices } = useDataStore()
    const [isScaleDrawerOpen, setIsScaleDrawerOpen] = useState(false)
    const scaleStatus = useScaleStatus()
    const [localScaleName, setLocalScaleName] = useState<string | null>(null)
    const [localScaleStatus, setLocalScaleStatus] = useState<Status | null>(null)

    const ready = true // typeof majorState !== 'undefined' && majorState !== MajorState.Sleep

    const handleScaleSelection = async () => {
        if (isScaleDrawerOpen) return
        
        setIsScaleDrawerOpen(true)
        try {
            await scaleSelectDrawer.pop({ 
                scanFn: scanForDevices, 
                fetchFn: getScales,
                onSelect: async (scaleId: string) => {
                    try {
                        const scales = await getScales();
                        const selectedScaleInfo = scales.find(s => s.id === scaleId);
                        
                        if (selectedScaleInfo) {
                            setLocalScaleName(selectedScaleInfo.name);
                            setLocalScaleStatus(Status.Busy);
                        }
                        
                        await selectScale(scaleId);
                        
                        if (selectedScaleInfo) {
                            setLocalScaleStatus(Status.On);
                        }
                    } catch (error) {
                        console.error('Failed to select scale:', error);
                        setLocalScaleName(null);
                        setLocalScaleStatus(null);
                    }
                }
            })
        } catch (e) {
            console.log('Scale selection drawer closed or rejected.')
        } finally {
            setIsScaleDrawerOpen(false);
            setTimeout(() => {
                setLocalScaleName(null);
                setLocalScaleStatus(null);
            }, 500);
        }
    }

    const displayScaleName = localScaleName || (selectedScale ? selectedScale.name : 'Connect');
    const displayScaleStatus = localScaleStatus || scaleStatus;

    return (
        <div
            {...props}
            css={[
                tw`
                    w-full
                    h-full
                    relative
                    bg-off-white
                    dark:bg-dark-grey
                `,
            ]}
        >
            <div
                css={[
                    tw`
                        h-full
                        pb-[9rem]
                    `,
                ]}
            >
                <div
                    css={[
                        tw`
                            h-full
                            flex
                            flex-col
                            items-center
                            justify-center
                        `,
                    ]}
                >
                    {ready ? <Controller /> : <Clock />}
                </div>
            </div>
            <Toolbar>
                <Pane
                    title={
                        <>
                            <span>Water</span>
                            <span>{mlToL(waterCapacity)}L MAX</span>
                        </>
                    }
                >
                    <WaterBar />
                </Pane>
                <Pane title="Scale">
                    <Button 
                        onClick={handleScaleSelection}
                        disabled={isScaleDrawerOpen}
                    >
                        <StatusIndicator 
                            value={displayScaleStatus}
                            css={tw`
                                absolute
                                right-2
                                top-2
                            `}
                        />
                        {displayScaleName}
                    </Button>
                </Pane>
                <Pane title="Settings">
                    <Button
                        onClick={async () => {
                            try {
                                await settingsDrawer.pop()
                            } catch (e) {
                                // Do nothing.
                            }
                        }}
                    >
                        Edit
                    </Button>
                </Pane>
                <Pane title="Power">
                    <PowerToggle />
                </Pane>
            </Toolbar>
        </div>
    )
}

type PaneProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    title?: ReactNode
}

function Pane({ children, title, ...props }: PaneProps) {
    return (
        <div {...props} css={tw`h-full`}>
            <div
                css={tw`
                    bg-[#fafafa]
                    dark:bg-black
                    h-full
                    w-full
                    px-6
                    pb-6
                `}
            >
                {!!title && (
                    <Label
                        css={[
                            tw`
                                items-center
                                h-[40px]
                            `,
                        ]}
                    >
                        {title}
                    </Label>
                )}
                <div
                    css={[
                        tw`
                            h-20
                        `,
                    ]}
                >
                    {children}
                </div>
            </div>
        </div>
    )
}
