import type { RealtimeEvent } from '@/contracts'

export type EventGate = {
  accept(e: RealtimeEvent): boolean
  reset(): void
}

/**
 * Filtro de eventos de tempo real: descarta `eventId` repetido (até `maxIds` lembrados)
 * e versão menor ou igual à última aceita para o mesmo recurso.
 */
export function createEventGate(maxIds = 500): EventGate {
  const seen = new Set<string>()
  const lastVersion = new Map<string, number>()

  return {
    accept(e) {
      if (seen.has(e.eventId)) return false
      const key = `${e.resource.type}:${e.resource.id}`
      const last = lastVersion.get(key)
      if (last !== undefined && e.version <= last) return false
      seen.add(e.eventId)
      if (seen.size > maxIds) {
        const oldest = seen.values().next().value
        if (oldest !== undefined) seen.delete(oldest)
      }
      lastVersion.set(key, e.version)
      return true
    },
    reset() {
      seen.clear()
      lastVersion.clear()
    },
  }
}
