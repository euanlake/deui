/**
 * Examples of how to use the R1 API configuration
 * 
 * This file demonstrates how to use the R1 API configuration in various scenarios.
 * These are examples only and not meant to be imported directly.
 */

import { R1ApiConfig } from './env';

/**
 * Example: Fetch available devices from the R1 API
 */
export const fetchDevicesExample = async () => {
  try {
    const response = await fetch(R1ApiConfig.endpoints.devices);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const devices = await response.json();
    return devices;
  } catch (error) {
    console.error('Error fetching devices:', error);
    return [];
  }
};

/**
 * Example: Trigger a device scan
 */
export const scanForDevicesExample = async () => {
  try {
    const response = await fetch(R1ApiConfig.endpoints.deviceScan);
    return response.ok;
  } catch (error) {
    console.error('Error scanning for devices:', error);
    return false;
  }
};

/**
 * Example: Connect to machine snapshot WebSocket
 */
export const connectToMachineSnapshotExample = (onMessage: (data: any) => void) => {
  try {
    const ws = new WebSocket(R1ApiConfig.wsEndpoints.machineSnapshot);
    
    ws.onopen = () => {
      console.log('Connected to machine snapshot WebSocket');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from machine snapshot WebSocket');
    };
    
    return ws;
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
    return null;
  }
};

/**
 * Example: Change machine state
 */
export const changeMachineStateExample = async (newState: string) => {
  try {
    const response = await fetch(R1ApiConfig.endpoints.setMachineState(newState), {
      method: 'PUT',
    });
    return response.ok;
  } catch (error) {
    console.error('Error changing machine state:', error);
    return false;
  }
};

/**
 * Example: Update shot settings
 */
export const updateShotSettingsExample = async (settings: any) => {
  try {
    const response = await fetch(R1ApiConfig.endpoints.setShotSettings, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    return response.ok;
  } catch (error) {
    console.error('Error updating shot settings:', error);
    return false;
  }
};

/**
 * Example: Toggle USB charger mode
 */
export const toggleUsbChargerExample = async (enable: boolean) => {
  const state = enable ? 'enable' : 'disable';
  try {
    const response = await fetch(R1ApiConfig.endpoints.setUsbCharger(state as 'enable' | 'disable'), {
      method: 'PUT',
    });
    return response.ok;
  } catch (error) {
    console.error('Error toggling USB charger mode:', error);
    return false;
  }
}; 