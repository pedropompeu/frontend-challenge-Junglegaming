type Kind = 'local' | 'session'

/** Acesso tolerante ao Web Storage: modo privado, cota estourada ou SSR não derrubam o app. */
function store(kind: Kind): Storage | null {
  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage
  } catch {
    return null
  }
}

export function readItem(kind: Kind, key: string): string | null {
  try {
    return store(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeItem(kind: Kind, key: string, value: string): void {
  try {
    store(kind)?.setItem(key, value)
  } catch {
    // Sem armazenamento: o valor vale só para esta carga.
  }
}

export function removeItem(kind: Kind, key: string): void {
  try {
    store(kind)?.removeItem(key)
  } catch {
    // Nada a remover.
  }
}

export function readJson<T>(kind: Kind, key: string, guard: (v: unknown) => v is T): T | null {
  const raw = readItem(kind, key)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return guard(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeJson(kind: Kind, key: string, value: unknown): void {
  writeItem(kind, key, JSON.stringify(value))
}

/** Chaves presentes no armazenamento (para limpezas por prefixo). */
export function storageKeys(kind: Kind): string[] {
  try {
    const s = store(kind)
    if (!s) return []
    return Array.from({ length: s.length }, (_, i) => s.key(i)).filter(
      (k): k is string => k !== null,
    )
  } catch {
    return []
  }
}
