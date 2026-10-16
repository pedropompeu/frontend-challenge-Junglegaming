const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** `0xA91F…E82C`, como no recibo do Figma; o hash completo fica no explorador. */
export function shortHash(hash: string): string {
  const upper = `0x${hash.replace(/^0x/i, '').toUpperCase()}`
  return upper.length > 12 ? `${upper.slice(0, 6)}…${upper.slice(-4)}` : upper
}

/** `29 Jul, 2026` (formato do frame, meses em português), no fuso de quem vê. */
export function formatOrderDate(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  return `${day} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}
