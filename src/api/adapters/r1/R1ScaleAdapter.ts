import axios from 'axios';
import { ScaleApi } from '../../interfaces/ScaleApi';
import { Scale } from '../../models/Scale';
import { transformR1ScaleToScale } from '../../transformers/restTransformers';

export class R1ScaleAdapter implements ScaleApi {
  private readonly baseUrl: string;
  private selectedScaleId: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get currently available scales
   * Uses R1 endpoint: GET /api/v1/devices
   * and filters for scale devices
   */
  async getScales(): Promise<Scale[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/devices`);
      
      // Filter for scales and transform to our Scale model
      return response.data
        .filter((device: any) => device.name.toLowerCase().includes('scale'))
        .map(transformR1ScaleToScale);
    } catch (error) {
      console.error('Error fetching scales from R1:', error);
      throw new Error('Failed to fetch scales from R1');
    }
  }
  
  /**
   * Get the currently selected scale
   * Returns selected scale from internal state or fetches list and returns first connected scale
   */
  async getSelectedScale(): Promise<Scale | null> {
    try {
      // If we have a stored selected scale ID, find it in the list
      if (this.selectedScaleId) {
        const scales = await this.getScales();
        const selectedScale = scales.find(scale => scale.id === this.selectedScaleId);
        
        if (selectedScale) {
          return selectedScale;
        }
        
        // If stored ID not found, reset selected ID
        this.selectedScaleId = null;
      }
      
      // If no selected scale, return first connected scale if any
      const scales = await this.getScales();
      const connectedScale = scales.find(scale => scale.connectionState === 'connected');
      
      if (connectedScale) {
        this.selectedScaleId = connectedScale.id;
        return connectedScale;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting selected scale:', error);
      throw new Error('Failed to get selected scale');
    }
  }
  
  /**
   * Select a scale by ID
   * Stores the scale ID internally for future reference
   */
  async selectScale(scaleId: string): Promise<void> {
    // R1 doesn't have a dedicated endpoint to select a scale, so we just store it
    this.selectedScaleId = scaleId;
  }
  
  /**
   * Tare the currently selected scale
   * Uses R1 endpoint: PUT /api/v1/scale/tare
   */
  async tare(): Promise<void> {
    try {
      // Make sure we have a selected scale
      const selectedScale = await this.getSelectedScale();
      if (!selectedScale) {
        throw new Error('No scale selected');
      }
      
      await axios.put(`${this.baseUrl}/api/v1/scale/tare`);
    } catch (error) {
      console.error('Error taring scale with R1:', error);
      throw new Error('Failed to tare scale with R1');
    }
  }
} 