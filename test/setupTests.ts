// Add any global setup code here
import '@testing-library/jest-dom';

// Ensure fetch is available in tests
global.fetch = jest.fn();

// Ensure local storage is mocked
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true
});

// Create WebSocket mock class with required properties
const WebSocketMock = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Add required static properties
WebSocketMock.CONNECTING = 0;
WebSocketMock.OPEN = 1;
WebSocketMock.CLOSING = 2;
WebSocketMock.CLOSED = 3;

// Assign the mock to global
global.WebSocket = WebSocketMock as unknown as typeof WebSocket;

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
}); 