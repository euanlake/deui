import React, { useEffect, useState, useCallback } from 'react'
import tw from 'twin.macro'
import Control, { ControlProps } from '../Control'
import TextField, { TextFieldDecorator } from '../primitives/TextField'
import Button from '../primitives/Button'
import { ButtonTheme } from '../primitives/Button'
import { debounce } from 'lodash'
import { useDataStore } from '$/stores/data'

type Props = Omit<ControlProps, 'fill' | 'pad'> & {
  defaultValue?: number;
  onChange?: (value: number) => void;
}

export default function StopAtVolumeControl({ 
  label = 'Stop at Volume ML',
  defaultValue = 0, 
  onChange,
  ...props 
}: Props) {
  const [valueString, setValueString] = useState(defaultValue.toString());
  const { updateShotSettings } = useDataStore();
  
  useEffect(() => {
    setValueString(defaultValue.toString());
  }, [defaultValue]);

  const updateVolumeSetting = useCallback(
    debounce(async (volume: number) => {
      try {
        // Create shot settings object with current volume and default values for other fields
        await updateShotSettings({
          targetShotVolume: volume,
          steamSetting: 1,
          targetSteamTemp: 150,
          targetSteamDuration: 30,
          targetHotWaterTemp: 90,
          targetHotWaterVolume: 250,
          targetHotWaterDuration: 15,
          groupTemp: 93.0
        });
      } catch (error) {
        console.error('Error updating shot settings:', error);
      }
    }, 500),
    [updateShotSettings]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValueString(e.target.value);
    const numericValue = parseInt(e.target.value, 10) || 0;
    if (onChange) {
      onChange(numericValue);
    }
    updateVolumeSetting(numericValue);
  };

  const handleClear = () => {
    setValueString('');
    if (onChange) {
      onChange(0);
    }
    updateVolumeSetting(0);
  };

  return (
    <Control
      {...props}
      label={label}
      fill
    >
      <div css={tw`h-full w-full relative`}>
        <TextFieldDecorator>
          <TextField
            value={valueString}
            onChange={handleChange}
          />
        </TextFieldDecorator>
        
        {valueString && (
          <div 
            css={tw`
              absolute 
              right-2 
              top-1/2 
              -translate-y-1/2 
              z-10
            `}
          >
            <Button 
              theme={ButtonTheme.None}
              onClick={handleClear}
              css={tw`
                w-8
                h-8
                rounded-full
                bg-dark-grey
                dark:bg-heavy-grey
                flex
                items-center
                justify-center
                p-0
              `}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L9 9M1 9L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
        )}
      </div>
    </Control>
  )
} 