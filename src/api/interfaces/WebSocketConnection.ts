export interface WebSocketConnection {
  onMessage(callback: (data: any) => void): void;
  onError(callback: (error: Error) => void): void;
  onClose(callback: () => void): void;
  close(): void;
} 