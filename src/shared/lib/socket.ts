import type { Socket } from 'socket.io-client'

/**
 * Socket.IO do app. Só WebSocket: o servidor simulado (MSW) não intercepta long-polling.
 * O token vai na query do handshake; sem token, o socket recebe só eventos públicos.
 *
 * O cliente é importado sob demanda: o `engine.io-client` guarda `globalThis.WebSocket`
 * ao avaliar o módulo, e o MSW só troca essa classe ao subir. Carregado depois do boot,
 * ele usa a classe interceptada (e sai do bundle inicial).
 */
export async function createSocket(token: string | null): Promise<Socket> {
  const { io } = await import('socket.io-client')
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
