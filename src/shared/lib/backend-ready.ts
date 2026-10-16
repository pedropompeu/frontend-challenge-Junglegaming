let ready: Promise<void> = Promise.resolve()

/**
 * Com o backend simulado, o app abre antes de ele subir: requisições e socket esperam esta
 * promessa (o `main.tsx` a registra). Sem mocks, já começa resolvida.
 */
export function setBackendReady(promise: Promise<void>): void {
  ready = promise
}

export function backendReady(): Promise<void> {
  return ready
}
