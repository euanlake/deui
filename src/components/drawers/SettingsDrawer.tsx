import React from 'react'
import Drawer, { DrawerHeader, DrawerProps } from '$/components/drawers/Drawer'
import tw from 'twin.macro'
import ThemeControl from '../controls/ThemeControl'
import BackendAddressControl from '../controls/BackendAddressControl'
import StopAtVolumeControl from '../controls/StopAtVolumeControl'
import StopAtWeightControl from '../controls/StopAtWeightControl'

export default function SettingsDrawer({ onReject }: Pick<DrawerProps, 'onReject'>) {
    return (
        <Drawer
            onReject={onReject}
            css={[
                tw`
                    hidden
                    lg:block
                `,
            ]}
        >
            <DrawerHeader title="Settings" />
            <div css={tw`px-14`}>
                <BackendAddressControl />
                <StopAtVolumeControl />
                <StopAtWeightControl />
                <ThemeControl fill pad />
            </div>
        </Drawer>
    )
}
