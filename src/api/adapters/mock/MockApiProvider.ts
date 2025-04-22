import { ApiProvider } from '../../interfaces/ApiProvider';
import { DeviceApi } from '../../interfaces/DeviceApi';
import { MachineApi } from '../../interfaces/MachineApi';
import { ScaleApi } from '../../interfaces/ScaleApi';
import { WebSocketApi } from '../../interfaces/WebSocketApi';
import { MockDeviceAdapter } from './MockDeviceAdapter';
import { MockMachineAdapter } from './MockMachineAdapter';
import { MockScaleAdapter } from './MockScaleAdapter';
import { MockWebSocketAdapter } from './MockWebSocketAdapter';

export class MockApiProvider implements ApiProvider {
  device: DeviceApi;
  machine: MachineApi;
  scale: ScaleApi;
  websocket: WebSocketApi;
  
  constructor() {
    this.device = new MockDeviceAdapter();
    this.machine = new MockMachineAdapter();
    this.scale = new MockScaleAdapter();
    this.websocket = new MockWebSocketAdapter();
  }
} 