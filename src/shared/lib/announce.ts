export type Politeness = 'polite' | 'assertive'

export const ANNOUNCER_IDS: Record<Politeness, string> = {
  polite: 'kurio-announcer-polite',
  assertive: 'kurio-announcer-assertive',
}

/** Escreve na live region do `<Announcer />`; limpa antes para repetir a mesma mensagem. */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  if (typeof document === 'undefined') return
  const region = document.getElementById(ANNOUNCER_IDS[politeness])
  if (!region) return
  region.textContent = ''
  setTimeout(() => {
    region.textContent = message
  }, 50)
}
