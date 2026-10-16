import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { isApiError } from '@/shared/lib/api-error'

/**
 * Leva os `fieldErrors` do servidor (ex.: e-mail já cadastrado) para os campos do formulário,
 * focando o primeiro. Devolve `false` quando o erro não é de campo e merece aviso geral.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'setError' | 'getValues'>,
  error: unknown,
): boolean {
  if (!isApiError(error) || !error.fieldErrors) return false
  const known = Object.keys(form.getValues())
  const entries = Object.entries(error.fieldErrors).filter(([name]) => known.includes(name))
  entries.forEach(([name, message], i) => {
    form.setError(name as Path<T>, { type: 'server', message }, { shouldFocus: i === 0 })
  })
  return entries.length > 0
}
