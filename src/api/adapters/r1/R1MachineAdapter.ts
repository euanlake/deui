import axios from 'axios';
import { MachineApi } from '../../interfaces/MachineApi';
import { MachineState, MachineStateType, Profile, ShotSettings } from '../../models/Machine';
import { 
  transformR1MachineStateToMachineState,
  transformProfileToR1Profile,
  transformR1ProfileToProfile,
  transformShotSettingsToR1ShotSettings
} from '../../transformers/restTransformers';
import { ErrorCategory, handleR1Error } from '../../utils/errorHandling';

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
      
      const appError = handleR1Error({
        message: 'Failed to fetch machine state from R1',
        category: ErrorCategory.MACHINE,
        code: 'machine.state_read_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
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
      
      const appError = handleR1Error({
        message: `Failed to set machine state to ${state} with R1`,
        category: ErrorCategory.MACHINE,
        code: 'machine.state_change_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
    }
  }
  
  /**
   * Upload profile to machine
   * Uses R1 endpoint: POST /api/v1/de1/profile
   */
  async uploadProfile(profile: Profile): Promise<void> {
    try {
      // Make sure profile has required fields for the R1 API
      const profileToUpload = {
        // Essential fields for the R1 API
        title: profile.title || 'Unnamed Profile',
        author: profile.author || 'User',
        notes: profile.notes || '',
        beverage_type: profile.beverage_type || 'espresso',
        // Ensure version is a string
        version: typeof profile.version === 'number' ? 
          String(profile.version) : (profile.version || '2.0'),
        // Other required fields
        steps: Array.isArray(profile.steps) ? profile.steps : [],
        // Include optional target values if they exist
        ...(profile.target_volume !== undefined && { target_volume: profile.target_volume }),
        ...(profile.target_weight !== undefined && { target_weight: profile.target_weight }),
        ...(profile.target_volume_count_start !== undefined && { 
          target_volume_count_start: profile.target_volume_count_start 
        }),
        ...(profile.tank_temperature !== undefined && { tank_temperature: profile.tank_temperature })
      };
      
      // Send profile directly to R1 API
      await axios.post(`${this.baseUrl}/api/v1/de1/profile`, profileToUpload);
    } catch (error) {
      console.error('Error uploading profile to R1:', error);
      
      const appError = handleR1Error({
        message: 'Failed to upload profile to R1',
        category: ErrorCategory.PROFILE,
        code: 'profile.upload_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
    }
  }
  
  /**
   * Get available profiles
   * Uses R1 endpoint: GET /api/v1/de1/profiles
   * Note: This endpoint might need to be implemented in the R1 API
   */
  async getProfiles(): Promise<Profile[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/de1/profiles`);
      
      // Transform each profile from R1 format to our model
      if (Array.isArray(response.data)) {
        return response.data.map(transformR1ProfileToProfile);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching profiles from R1:', error);
      
      const appError = handleR1Error({
        message: 'Failed to fetch profiles from R1',
        category: ErrorCategory.PROFILE,
        code: 'profile.list_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
    }
  }
  
  /**
   * Get a specific profile by ID
   * Uses R1 endpoint: GET /api/v1/de1/profiles/:profileId
   * Note: This endpoint might need to be implemented in the R1 API
   */
  async getProfileById(profileId: string): Promise<Profile> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/de1/profiles/${profileId}`);
      
      // Transform the profile from R1 format to our model
      return transformR1ProfileToProfile(response.data);
    } catch (error) {
      console.error(`Error fetching profile ${profileId} from R1:`, error);
      
      const appError = handleR1Error({
        message: `Failed to fetch profile ${profileId} from R1`,
        category: ErrorCategory.PROFILE,
        code: 'profile.not_found',
        originalError: error
      });
      
      throw new Error(appError.message);
    }
  }
  
  /**
   * Select a profile for use on the machine
   * Uses R1 endpoint: PUT /api/v1/de1/profiles/:profileId/select
   * Note: This endpoint might need to be implemented in the R1 API
   */
  async selectProfile(profileId: string): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/api/v1/de1/profiles/${profileId}/select`);
    } catch (error) {
      console.error(`Error selecting profile ${profileId} on R1:`, error);
      
      const appError = handleR1Error({
        message: `Failed to select profile ${profileId} on R1`,
        category: ErrorCategory.PROFILE,
        code: 'profile.select_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
    }
  }
  
  /**
   * Update shot settings
   * Uses R1 endpoint: POST /api/v1/de1/shotSettings
   */
  async updateShotSettings(settings: ShotSettings): Promise<void> {
    try {
      // The R1 API expected format matches our ShotSettings interface
      // Just ensure all required fields are present
      const shotSettings = {
        // Ensure all required properties are included with defaults if needed
        steamSetting: settings.steamSetting ?? 1,
        targetSteamTemp: settings.targetSteamTemp ?? 150,
        targetSteamDuration: settings.targetSteamDuration ?? 30,
        targetHotWaterTemp: settings.targetHotWaterTemp ?? 90,
        targetHotWaterVolume: settings.targetHotWaterVolume ?? 250,
        targetHotWaterDuration: settings.targetHotWaterDuration ?? 15,
        targetShotVolume: settings.targetShotVolume ?? 36,
        groupTemp: settings.groupTemp ?? 93.0
      };
      
      await axios.post(`${this.baseUrl}/api/v1/de1/shotSettings`, shotSettings);
    } catch (error) {
      console.error('Error updating shot settings with R1:', error);
      
      const appError = handleR1Error({
        message: 'Failed to update shot settings with R1',
        category: ErrorCategory.MACHINE,
        code: 'machine.shot_settings_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
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
      
      const appError = handleR1Error({
        message: `Failed to set USB charging to ${enabled} with R1`,
        category: ErrorCategory.MACHINE,
        code: 'machine.usb_charging_failed',
        originalError: error
      });
      
      throw new Error(appError.message);
    }
  }
} 