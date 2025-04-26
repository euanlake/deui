import React, { useEffect, useState, useCallback, useRef } from 'react'
import tw from 'twin.macro'
import Control, { ControlProps } from '../Control'
import TextField, { TextFieldDecorator } from '../primitives/TextField'
import Button from '../primitives/Button'
import { ButtonTheme } from '../primitives/Button'
import { debounce } from 'lodash'
import { useDataStore } from '$/stores/data'
import axios from 'axios'
import { R1ApiConfig } from '$/config/env'

// Local storage key for target weight
const TARGET_WEIGHT_STORAGE_KEY = 'deui_target_weight';

type Props = Omit<ControlProps, 'fill' | 'pad'> & {
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
}

export default function StopAtWeightControl({ 
  label = 'Stop at Weight G',
  defaultValue = null, 
  onChange,
  ...props 
}: Props) {
  // Initialize with value from localStorage or default
  const getSavedWeight = (): number | null => {
    try {
      const saved = localStorage.getItem(TARGET_WEIGHT_STORAGE_KEY);
      return saved ? Number(saved) : defaultValue;
    } catch (e) {
      console.error('Error reading target weight from localStorage:', e);
      return defaultValue;
    }
  };

  const [valueString, setValueString] = useState(() => {
    const savedWeight = getSavedWeight();
    return savedWeight !== null ? savedWeight.toString() : '';
  });
  const [targetWeight, setTargetWeight] = useState<number | null>(getSavedWeight());
  const { scaleSnapshot, machineState, setMachineState } = useDataStore();
  const stopInProgress = useRef(false);
  
  // Load from localStorage on mount
  useEffect(() => {
    const savedWeight = getSavedWeight();
    if (savedWeight !== null) {
      setValueString(savedWeight.toString());
      setTargetWeight(savedWeight);
      if (onChange) {
        onChange(savedWeight);
      }
      console.log(`Loaded target weight from localStorage: ${savedWeight}g`);
    }
  }, [onChange]);

  // Monitor weight during shot and stop if target is reached
  useEffect(() => {
    if (!targetWeight || targetWeight <= 0 || !scaleSnapshot || !machineState) {
      // Reset stop flag when not in a shot
      if (machineState?.state !== 'espresso') {
        stopInProgress.current = false;
      }
      return;
    }

    // Debug logging for weight monitoring
    const isEspresso = machineState.state === 'espresso';
    const isInValidSubstate = machineState.substate === 'pour' || machineState.substate === 'preinfusion';
    const currentWeight = scaleSnapshot.weight;
    
    console.log(`Weight monitor - Target: ${targetWeight}g, Current: ${currentWeight.toFixed(1)}g, State: ${machineState.state}.${machineState.substate || 'none'}`);

    // Only check during espresso pour or preinfusion states
    if (isEspresso && isInValidSubstate) {
      // If the current weight reached or exceeded the target weight, stop the shot
      if (currentWeight >= targetWeight && !stopInProgress.current) {
        console.log(`🎯 Target weight ${targetWeight}g reached (current: ${currentWeight.toFixed(1)}g). Stopping shot.`);
        
        // Set flag to prevent multiple stop attempts
        stopInProgress.current = true;
        
        // Stop the shot by setting machine state to idle
        setMachineState('idle')
          .then(() => {
            console.log('✅ Shot successfully stopped at target weight');
          })
          .catch(error => {
            console.error('❌ Error stopping shot at target weight:', error);
            // Reset flag on error so we can try again
            stopInProgress.current = false;
          });
          
      }
    } else {
      // Reset flag when not in correct shot phase
      stopInProgress.current = false;
    }
  }, [scaleSnapshot, machineState, targetWeight, setMachineState]);

  const updateWeightSetting = useCallback(
    debounce((weight: number | null) => {
      // Store the weight setting in state
      setTargetWeight(weight);
      
      // Save to localStorage
      try {
        if (weight !== null) {
          localStorage.setItem(TARGET_WEIGHT_STORAGE_KEY, weight.toString());
        } else {
          localStorage.removeItem(TARGET_WEIGHT_STORAGE_KEY);
        }
      } catch (e) {
        console.error('Error saving target weight to localStorage:', e);
      }
      
      console.log(`Set target weight to ${weight}g and saved to localStorage`);
    }, 500),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValueString(e.target.value);
    const numericValue = e.target.value ? parseInt(e.target.value, 10) || 0 : null;
    if (onChange) {
      onChange(numericValue);
    }
    updateWeightSetting(numericValue);
  };

  const handleClear = () => {
    setValueString('');
    if (onChange) {
      onChange(null);
    }
    updateWeightSetting(null);
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