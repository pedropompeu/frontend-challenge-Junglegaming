import { parseSearchWith, stringifySearchWith } from '@tanstack/react-router'

/**
 * Listas vão para a URL como CSV (`networks=polygon,ethereum`), no mesmo formato da API,
 * em vez do JSON padrão do router. Os schemas de rota aceitam as duas formas.
 */
function stringifyValue(value: unknown): string {
  return Array.isArray(value) ? value.map(String).join(',') : JSON.stringify(value)
}

export const stringifySearch = stringifySearchWith(stringifyValue)
export const parseSearch = parseSearchWith(JSON.parse)
