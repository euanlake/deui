import { Scale } from '../models/Scale';

export interface ScaleApi {
  tare(): Promise<void>;
  getSelectedScale(): Promise<Scale | null>;
  selectScale(scaleId: string): Promise<void>;
} 