import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

/** Mínimo para a busca do header; a Task 11 troca pelo `catalogSearchSchema` completo. */
const searchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  component: HomePage,
})

function HomePage() {
  return (
    <div className="page-container py-10">
      <h1 className="text-2xl font-bold">Kurio</h1>
    </div>
  )
}
