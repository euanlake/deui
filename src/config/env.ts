/**
 * Environment Configuration for R1 API Endpoints
 * 
 * This file provides environment-specific configurations for connecting to R1 API endpoints.
 * It automatically selects the appropriate configuration based on the current environment.
 */

// Detect if we're in development or production mode
const isDevelopment = import.meta.env.MODE === 'development';

// Common base paths for API endpoints
const API_VERSION = 'v1';
const WS_VERSION = 'v1';

/**
 * Environment-specific configurations
 */
const ENV_CONFIG = {
  development: {
    // In development, we use a local or test instance
    R1_API_BASE_URL: import.meta.env.VITE_R1_API_URL || 'http://localhost:8000/api',
    R1_WS_BASE_URL: import.meta.env.VITE_R1_WS_URL || 'ws://localhost:8000/ws',
  },
  production: {
    // In production, we connect to the actual tablet IP
    // This will be overridden by environment variables if provided
    R1_API_BASE_URL: import.meta.env.VITE_R1_API_URL || 'http://<tablet-ip>/api',
    R1_WS_BASE_URL: import.meta.env.VITE_R1_WS_URL || 'ws://<tablet-ip>/ws',
  },
};

// Select the appropriate configuration based on environment
const currentConfig = isDevelopment ? ENV_CONFIG.development : ENV_CONFIG.production;

/**
 * R1 API Endpoint Configuration
 */
export const R1ApiConfig = {
  // Base URLs
  baseApiUrl: currentConfig.R1_API_BASE_URL,
  baseWsUrl: currentConfig.R1_WS_BASE_URL,
  
  // REST API Endpoints
  endpoints: {
    devices: `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/devices`,
    deviceScan: `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/devices/scan`,
    machineState: `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/de1/state`,
    setMachineState: (newState: string) => `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/de1/state/${newState}`,
    setProfile: `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/de1/profile`,
    setShotSettings: `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/de1/shotSettings`,
    setUsbCharger: (state: 'enable' | 'disable') => `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/de1/usb/${state}`,
    tareScale: `${currentConfig.R1_API_BASE_URL}/${API_VERSION}/scale/tare`,
  },
  
  // WebSocket Endpoints
  wsEndpoints: {
    machineSnapshot: `${currentConfig.R1_WS_BASE_URL}/${WS_VERSION}/de1/snapshot`,
    shotSettings: `${currentConfig.R1_WS_BASE_URL}/${WS_VERSION}/de1/shotSettings`,
    waterLevels: `${currentConfig.R1_WS_BASE_URL}/${WS_VERSION}/de1/waterLevels`,
    scaleSnapshot: `${currentConfig.R1_WS_BASE_URL}/${WS_VERSION}/scale/snapshot`,
  },

  // Get environment type
  isDevelopment,
  isProduction: !isDevelopment,
};

export default R1ApiConfig; 