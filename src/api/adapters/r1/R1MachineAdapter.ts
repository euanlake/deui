import axios from 'axios';
import { MachineApi } from '../../interfaces/MachineApi';
import { MachineState, MachineStateType, Profile, ShotSettings } from '../../models/Machine';
import { 
  transformR1MachineStateToMachineState,
  transformProfileToR1Profile,
  transformShotSettingsToR1ShotSettings
} from '../../transformers/restTransformers';

export class R1MachineAdapter implements MachineApi {
  private readonly baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get current machine state
   * Uses R1 endpoint: GET /api/v1/de1/state
   */
  async getState(): Promise<MachineState> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/de1/state`);
      
      // Transform R1 machine state to our MachineState model
      return transformR1MachineStateToMachineState(response.data);
    } catch (error) {
      console.error('Error fetching machine state from R1:', error);
      throw new Error('Failed to fetch machine state from R1');
    }
  }
  
  /**
   * Set machine state
   * Uses R1 endpoint: PUT /api/v1/de1/state/<newState>
   */
  async setState(state: MachineStateType): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/api/v1/de1/state/${state}`);
    } catch (error) {
      console.error(`Error setting machine state to ${state} with R1:`, error);
      throw new Error(`Failed to set machine state to ${state} with R1`);
    }
  }
  
  /**
   * Upload profile to machine
   * Uses R1 endpoint: POST /api/v1/de1/profile
   */
  async uploadProfile(profile: Profile): Promise<void> {
    try {
      const r1Profile = transformProfileToR1Profile(profile);
      await axios.post(`${this.baseUrl}/api/v1/de1/profile`, r1Profile);
    } catch (error) {
      console.error('Error uploading profile to R1:', error);
      throw new Error('Failed to upload profile to R1');
    }
  }
  
  /**
   * Update shot settings
   * Uses R1 endpoint: POST /api/v1/de1/shotSettings
   */
  async updateShotSettings(settings: ShotSettings): Promise<void> {
    try {
      const r1Settings = transformShotSettingsToR1ShotSettings(settings);
      await axios.post(`${this.baseUrl}/api/v1/de1/shotSettings`, r1Settings);
    } catch (error) {
      console.error('Error updating shot settings with R1:', error);
      throw new Error('Failed to update shot settings with R1');
    }
  }
  
  /**
   * Set USB charging state
   * Uses R1 endpoint: PUT /api/v1/de1/usb/<state>
   */
  async setUsbCharging(enabled: boolean): Promise<void> {
    try {
      const state = enabled ? 'enable' : 'disable';
      await axios.put(`${this.baseUrl}/api/v1/de1/usb/${state}`);
    } catch (error) {
      console.error(`Error setting USB charging to ${enabled} with R1:`, error);
      throw new Error(`Failed to set USB charging to ${enabled} with R1`);
    }
  }
} 