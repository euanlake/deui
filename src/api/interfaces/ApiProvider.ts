import { DeviceApi } from './DeviceApi';
import { MachineApi } from './MachineApi';
import { ScaleApi } from './ScaleApi';
import { WebSocketApi } from './WebSocketApi';

export interface ApiProvider {
  device: DeviceApi;
  machine: MachineApi;
  scale: ScaleApi;
  websocket: WebSocketApi;
} 