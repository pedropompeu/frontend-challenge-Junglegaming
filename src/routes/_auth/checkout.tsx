import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/checkout')({
  component: CheckoutPage,
})

/** Pagamento provisório: a Task 17 traz rede, carteira e confirmação. */
function CheckoutPage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold md:text-4xl">Pagamento</h1>
    </section>
  )
}
