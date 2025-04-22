import { WebSocketConnection } from '../api/interfaces/WebSocketConnection';
import { ChunkType } from '../shared/types';

export interface WsController {
    read: () => Promise<any | undefined>
    discard: () => void
}

export default function wsStream(connection: WebSocketConnection): WsController {
    const reader = createStreamReader(connection)
    
    return {
        async read() {
            return (await reader.read()).value
        },
        
        discard() {
            connection.close()
        }
    }
}

function createStreamReader(connection: WebSocketConnection) {
    const stream = new ReadableStream<any>({
        start(controller) {
            connection.onMessage((data) => {
                controller.enqueue({
                    type: ChunkType.WebSocketMessage,
                    payload: data
                })
            })
            
            connection.onError((error) => {
                controller.enqueue({
                    type: ChunkType.WebSocketError,
                    payload: error
                })
            })
            
            connection.onClose(() => {
                controller.enqueue({
                    type: ChunkType.WebSocketClose,
                    payload: null
                })
                
                controller.close()
            })
            
            // Simulate open event since we don't have direct access to it in our abstraction
            setTimeout(() => {
                controller.enqueue({
                    type: ChunkType.WebSocketOpen,
                    payload: null
                })
            }, 0)
        },
        
        cancel() {
            connection.close()
        }
    })
    
    return stream.getReader()
}

// Helper function to connect a WebSocketConnection to the old wsStream API
export function updateWsStream(url: string, connection: WebSocketConnection): WsController {
    return wsStream(connection)
}
