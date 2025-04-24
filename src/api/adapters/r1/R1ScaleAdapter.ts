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
      console.log('Fetching scales from R1 API...');
      const response = await axios.get(`${this.baseUrl}/api/v1/devices`);
      console.log('Raw devices from API:', response.data);
      
      // The API returns devices with a "state" property, but our model uses "connectionState"
      // Filter for any device that could be a scale using broader detection criteria
      const scaleDevices = response.data.filter((device: any) => {
        const isScaleByType = device.type === 'scale';
        const isScaleByName = device.name && (
          device.name.toLowerCase().includes('scale') ||
          device.name.toLowerCase().includes('acaia') ||
          device.name.toLowerCase().includes('decent') ||
          device.name.toLowerCase().includes('luna') ||
          device.name.toLowerCase().includes('felicita') ||
          device.name.toLowerCase().includes('skale') ||
          device.name.toLowerCase().includes('eureka') ||
          device.name.toLowerCase().includes('hiroia') ||
          device.name.toLowerCase().includes('jimmy') ||
          device.name.toLowerCase().includes('weightman') ||
          device.name.toLowerCase().includes('bookoo')
        );
        
        return isScaleByType || isScaleByName;
      });
      
      console.log('Identified scale devices:', scaleDevices);
      
      // Transform to our scale model
      return scaleDevices.map(transformR1ScaleToScale);
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
        console.log(`Looking for previously selected scale: ${this.selectedScaleId}`);
        const scales = await this.getScales();
        const selectedScale = scales.find(scale => scale.id === this.selectedScaleId);
        
        if (selectedScale) {
          console.log(`Found previously selected scale: ${selectedScale.name}`);
          return selectedScale;
        }
        
        // If stored ID not found, reset selected ID
        console.log(`Selected scale ID ${this.selectedScaleId} no longer found, resetting`);
        this.selectedScaleId = null;
      }
      
      // If no selected scale, return first connected scale if any
      const scales = await this.getScales();
      
      // First check for scales with connectionState='connected'
      const connectedScale = scales.find(scale => scale.connectionState === 'connected');
      
      if (connectedScale) {
        console.log(`Auto-selecting connected scale: ${connectedScale.name}`);
        this.selectedScaleId = connectedScale.id;
        return connectedScale;
      }
      
      console.log('No connected scales found');
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
    try {
      // R1 doesn't have a dedicated endpoint to select a scale, so we just store it
      this.selectedScaleId = scaleId;
      
      // Check if the scale is actually available
      const scales = await this.getScales();
      const selectedScale = scales.find(scale => scale.id === scaleId);
      
      if (!selectedScale) {
        throw new Error(`Scale with ID ${scaleId} not found`);
      }
      
      console.log(`Selected scale: ${selectedScale.name} (${scaleId})`);
    } catch (error: any) {
      console.error('Error selecting scale:', error);
      throw new Error(`Failed to select scale: ${error?.message || 'Unknown error'}`);
    }
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