import { io, type Socket } from 'socket.io-client'

/**
 * Socket.IO do app. Só WebSocket: o servidor simulado (MSW) não intercepta long-polling.
 * O token vai na query do handshake; sem token, o socket recebe só eventos públicos.
 */
export function createSocket(token: string | null): Socket {
  return io(location.origin, {
    path: '/socket.io',
    transports: ['websocket'],
    query: token ? { token } : {},
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    autoConnect: true,
  })
}
