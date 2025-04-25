import { Scale } from '../models/Scale';

export interface ScaleApi {
  /**
   * Tare the currently selected scale
   */
  tare(): Promise<void>;
  
  /**
   * Get the currently selected scale
   * @returns The currently selected scale or null if none is selected
   */
  getSelectedScale(): Promise<Scale | null>;
  
  /**
   * Select a scale by ID
   * @param scaleId The ID of the scale to select
   */
  selectScale(scaleId: string): Promise<void>;
  
  /**
   * Get a list of available scales
   * @returns Array of available scales
   */
  getScales(): Promise<Scale[]>;
} 