import type { Order } from '@/contracts'
import { smallSrc } from '@/features/catalog/components/nft-card'
import { EDITION_LABELS } from '@/features/nft/editions'
import { formatEth } from '@/shared/lib/money'

const footLabel = 'pt-3 text-left text-[15px] md:pl-40'

/**
 * Itens e valores do pedido, sempre do snapshot gravado nele: preço, nome e arte mudarem
 * depois no catálogo não alteram o que foi comprado.
 */
export function OrderLines({ order }: { order: Order }) {
  return (
    <table aria-label="Itens do pedido" className="w-full border-collapse">
      <thead>
        <tr className="border-b border-line text-[15px]">
          <th scope="col" className="pb-3 text-left font-bold">
            NFTs
          </th>
          <th scope="col" className="px-2 pb-3 text-center font-bold max-md:hidden">
            Edições
          </th>
          <th scope="col" className="pb-3 text-right font-normal">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        {order.lines.map((line) => (
          <tr key={line.cartItemId}>
            <td className="py-2 pr-2">
              <div className="flex items-center gap-3">
                {line.image ? (
                  <img
                    src={smallSrc(line.image.src)}
                    alt=""
                    width={line.image.width}
                    height={line.image.height}
                    loading="lazy"
                    decoding="async"
                    className="size-12 shrink-0 rounded-[6px] object-cover md:size-[70px]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-12 shrink-0 rounded-[6px] bg-surface-2 md:size-[70px]"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-bold break-words text-cream md:text-[17px]">{line.name}</p>
                  {line.tokenId ? (
                    <p className="text-xs text-khaki md:text-sm">ID do token: {line.tokenId}</p>
                  ) : null}
                  <p className="text-xs text-khaki md:text-sm">
                    Edição {EDITION_LABELS[line.editionKind]}
                    {/* Sem a coluna "Edições" no mobile, a quantidade acompanha o item. */}
                    <span className="md:hidden"> · (x {line.quantity})</span>
                  </p>
                </div>
              </div>
            </td>
            <td className="px-2 text-center text-sm whitespace-nowrap text-sand max-md:hidden">
              (x {line.quantity})
            </td>
            <td className="text-right font-bold whitespace-nowrap text-primary-hi md:text-lg">
              {formatEth(line.lineTotal)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        {order.coupon ? (
          <tr>
            <th scope="row" className={`${footLabel} font-normal`}>
              Cupom {order.coupon.code}
            </th>
            <td aria-hidden="true" className="max-md:hidden" />
            <td data-testid="receipt-discount" className="pt-3 text-right whitespace-nowrap">
              (-) {formatEth(order.discount)}
            </td>
          </tr>
        ) : null}
        <tr>
          <th scope="row" className={`${footLabel} font-normal`}>
            Taxa de rede
          </th>
          <td aria-hidden="true" className="max-md:hidden" />
          <td data-testid="receipt-fee" className="pt-3 text-right whitespace-nowrap md:text-lg">
            {formatEth(order.networkFee)}
          </td>
        </tr>
        <tr className="border-b border-line">
          <th scope="row" className={`${footLabel} pb-3 font-bold`}>
            Total
          </th>
          <td aria-hidden="true" className="max-md:hidden" />
          <td
            data-testid="receipt-total"
            className="pt-3 pb-3 text-right font-bold whitespace-nowrap text-primary-hi md:text-lg"
          >
            {formatEth(order.total)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}
