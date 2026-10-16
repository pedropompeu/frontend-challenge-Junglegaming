import type { z } from 'zod'
import { apiError } from '../route'

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response }

/** Converte issues do zod em `fieldErrors` (primeira mensagem por campo). */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    out[key] ??= issue.message
  }
  return out
}

export function validate<S extends z.ZodTypeAny>(schema: S, input: unknown): Parsed<z.infer<S>> {
  const r = schema.safeParse(input)
  if (r.success) return { ok: true, data: r.data }
  return {
    ok: false,
    response: apiError(422, 'VALIDATION_ERROR', 'Dados inválidos', { fieldErrors: toFieldErrors(r.error) }),
  }
}

export async function parseBody<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<Parsed<z.infer<S>>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: apiError(422, 'VALIDATION_ERROR', 'Corpo da requisição inválido') }
  }
  return validate(schema, raw)
}
