import React from 'react'
import 'twin.macro'
import ThemeControl from '../controls/ThemeControl'
import Control from '$/components/Control'
import { mlToL } from '$/utils'
import WaterBar from '$/components/ui/WaterBar'
import PowerToggle from '$/components/ui/PowerToggle'
import BackendAddressControl from '$/components/controls/BackendAddressControl'
import ScaleControl from '$/components/controls/ScaleControl'
import { useDataStore } from '$/stores/data'
import { Prop } from '$/shared/types'

export default function SettingsView() {
    const { [Prop.WaterCapacity]: waterCapacity = 0 } = useDataStore().properties

    return (
        <div tw="px-14">
            <BackendAddressControl />
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
            <ScaleControl pad fill />
            <ThemeControl pad fill />
            <Control label="Power" pad fill>
                <PowerToggle />
            </Control>
        </div>
    )
}
