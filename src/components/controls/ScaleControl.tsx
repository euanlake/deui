import React, { useState, useEffect } from 'react'
import Control, { ControlProps } from '../Control'
import { toaster } from 'toasterhea'
import { Layer } from '$/shared/types'
import { useDataStore } from '$/stores/data'
import { Scale } from '$/api/models/Scale'
import Button from '../primitives/Button'
import ScaleSelectDrawer from '../drawers/ScaleSelectDrawer'

const scaleSelectDrawer = toaster(ScaleSelectDrawer, Layer.Drawer)

export default function ScaleControl({ label = 'Scale', ...props }: ControlProps) {
    const { getScales, selectedScale, selectScale, scanForDevices } = useDataStore()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const buttonText = selectedScale ? selectedScale.name : 'Connect'

    const handleScaleSelection = async () => {
        if (isDrawerOpen) return
        
        setIsDrawerOpen(true)
        try {
            await scaleSelectDrawer.pop({ 
                scanFn: scanForDevices, 
                fetchFn: getScales,
                onSelect: async (scaleId) => {
                    await selectScale(scaleId)
                }
            })
        } catch (e) {
            console.log('Scale selection drawer closed or rejected.')
        } finally {
            setIsDrawerOpen(false)
        }
    }

    return (
        <Control {...props} label={label}>
            <Button 
                onClick={handleScaleSelection}
                disabled={isDrawerOpen}
            >
                {buttonText}
            </Button>
        </Control>
    )
} 