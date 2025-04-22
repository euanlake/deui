import { ApiProvider } from '../../interfaces/ApiProvider';
import { DeviceApi } from '../../interfaces/DeviceApi';
import { MachineApi } from '../../interfaces/MachineApi';
import { ScaleApi } from '../../interfaces/ScaleApi';
import { WebSocketApi } from '../../interfaces/WebSocketApi';
import { R1DeviceAdapter } from './R1DeviceAdapter';
import { R1MachineAdapter } from './R1MachineAdapter';
import { R1ScaleAdapter } from './R1ScaleAdapter';
import { R1WebSocketAdapter } from './R1WebSocketAdapter';

export class R1ApiProvider implements ApiProvider {
  private readonly baseUrl: string;
  
  device: DeviceApi;
  machine: MachineApi;
  scale: ScaleApi;
  websocket: WebSocketApi;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.device = new R1DeviceAdapter(baseUrl);
    this.machine = new R1MachineAdapter(baseUrl);
    this.scale = new R1ScaleAdapter(baseUrl);
    this.websocket = new R1WebSocketAdapter(baseUrl);
  }
} 