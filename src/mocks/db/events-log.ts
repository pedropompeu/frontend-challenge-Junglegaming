import type { RealtimeEvent } from '@/contracts'
import { getDb, mutate } from './store'

const MAX_EVENTS = 200

/** Registra um evento realtime emitido (limitado aos últimos 200) para depuração e replay. */
export function appendEvent(event: RealtimeEvent): void {
  mutate((db) => {
    db.eventLog.push(event)
    if (db.eventLog.length > MAX_EVENTS) db.eventLog.splice(0, db.eventLog.length - MAX_EVENTS)
  })
}

export function recentEvents(limit = 50): RealtimeEvent[] {
  return getDb().eventLog.slice(-limit)
}
