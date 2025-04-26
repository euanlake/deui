import React from 'react'
import 'twin.macro'
import ThemeControl from '../controls/ThemeControl'
import Control from '$/components/Control'
import { mlToL } from '$/utils'
import WaterBar from '$/components/ui/WaterBar'
import PowerToggle from '$/components/ui/PowerToggle'
import BackendAddressControl from '$/components/controls/BackendAddressControl'
import StopAtVolumeControl from '$/components/controls/StopAtVolumeControl'
import StopAtWeightControl from '$/components/controls/StopAtWeightControl'

export default function SettingsView() {
    // Use a fixed water capacity value (same as in WaterBar)
    const waterCapacity = 1500

    return (
        <div tw="px-14">
            <BackendAddressControl />
            <StopAtVolumeControl />
            <StopAtWeightControl />
            <Control
                label={
                    <>
                        <span>Water tank</span>
                        <span>{mlToL(waterCapacity)}L MAX</span>
                    </>
                }
            >
                <WaterBar />
            </Control>
            <ThemeControl pad fill />
            <Control label="Power" pad fill>
                <PowerToggle />
            </Control>
        </div>
    )
}
