import type { ReactNode, Ref } from 'react'
import type { Quote } from '@/contracts'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { EDITION_LABELS } from '@/features/nft/editions'
import { formatEth } from '@/shared/lib/money'
import { PROVIDER_LABELS } from '../labels'
import type { CheckoutFormValues } from '../schemas'

type OrderReviewProps = {
  quote: Quote
  values: CheckoutFormValues
  /** Nome da carteira escolhida (apelido da cadastrada ou "Carteira avulsa"). */
  walletLabel: string
  headingRef?: Ref<HTMLHeadingElement>
  /** Aviso de valores que mudaram durante a revisão. */
  notice?: ReactNode
  onEdit: () => void
  editDisabled?: boolean
}

function Row({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sand">{label}</dt>
      <dd data-testid={testId} className="text-right break-all">
        {children}
      </dd>
    </div>
  )
}

/** Tudo o que vai no pedido, para conferir antes de confirmar. */
export function OrderReview({
  quote,
  values,
  walletLabel,
  headingRef,
  notice,
  onEdit,
  editDisabled,
}: OrderReviewProps) {
  const note = values.note.trim()
  return (
    <section
      aria-labelledby="order-review-title"
      className="grid gap-6 rounded-[16px] bg-surface px-5 py-6 md:px-8"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="order-review-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-bold outline-none"
        >
          Revise seu pedido
        </h2>
        <button
          type="button"
          onClick={onEdit}
          disabled={editDisabled}
          className="text-sm font-bold text-primary-hi hover:underline disabled:opacity-50"
        >
          Editar dados
        </button>
      </div>
      {notice}

      <div>
        <h3 className="mb-2 font-bold">Colecionador</h3>
        <dl className="grid gap-2 text-[15px]">
          <Row label="Nome de exibição">{values.displayName.trim()}</Row>
          <Row label="Usuário">@{values.username.trim()}</Row>
          <Row label="E-mail">{values.email.trim()}</Row>
          <Row label="Perfil">{values.profileName.trim()}</Row>
          {values.ensName.trim() ? <Row label="Nome ENS">{values.ensName.trim()}.eth</Row> : null}
          {values.referralCode.trim() ? (
            <Row label="Indicação">{values.referralCode.trim()}</Row>
          ) : null}
          {note ? <Row label="Observação">{note}</Row> : null}
        </dl>
      </div>

      <div>
        <h3 className="mb-2 font-bold">Pagamento</h3>
        <dl className="grid gap-2 text-[15px]">
          <Row label="Carteira">{walletLabel}</Row>
          <Row label="Endereço">{values.walletAddress.trim()}</Row>
          <Row label="Conectar com">{PROVIDER_LABELS[values.provider]}</Row>
          <Row label="Rede">{NETWORK_LABELS[quote.network]}</Row>
        </dl>
      </div>

      <div>
        <h3 className="mb-2 font-bold">Itens</h3>
        <ul aria-label="Itens da revisão" className="grid gap-2 text-[15px]">
          {quote.lines.map((line) => (
            <li key={line.cartItemId} className="flex items-start justify-between gap-4">
              <span>
                {line.name}{' '}
                <span className="text-sand">
                  · Edição {EDITION_LABELS[line.editionKind]} (x {line.quantity})
                </span>
              </span>
              <span>{formatEth(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[15px]">
          <Row label="Subtotal" testId="review-subtotal">
            {formatEth(quote.subtotal)}
          </Row>
          <Row
            label={
              quote.coupon ? `Cupom ${quote.coupon.code} (${quote.coupon.percentOff}%)` : 'Desconto'
            }
            testId="review-discount"
          >
            (-) {formatEth(quote.discount)}
          </Row>
          <Row label="Taxa de rede" testId="review-fee">
            {formatEth(quote.networkFee)}
          </Row>
          <div className="flex items-start justify-between gap-4 font-bold">
            <dt>Total</dt>
            <dd data-testid="review-total" className="text-lg text-primary-hi">
              {formatEth(quote.total)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
