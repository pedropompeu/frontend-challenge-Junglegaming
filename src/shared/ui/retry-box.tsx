import { errorMessage } from '@/shared/lib/api-error'

/** Falha ao carregar um bloco: título, mensagem segura e nova tentativa. */
export function RetryBox({
  title,
  error,
  onRetry,
}: {
  title: string
  error: unknown
  onRetry: () => void
}) {
  return (
    <div role="alert" className="rounded-[10px] bg-surface px-6 py-8 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm text-sand">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-primary px-5 py-2 font-bold text-ink hover:bg-primary-hi"
      >
        Tentar novamente
      </button>
    </div>
  )
}
