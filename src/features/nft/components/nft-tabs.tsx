import type { Nft } from '@/contracts'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Rating } from './rating'

const trigger =
  'h-10 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-base text-cream shadow-none data-[state=active]:border-primary-hi data-[state=active]:bg-transparent data-[state=active]:text-primary-hi data-[state=active]:shadow-none'

/** "Detalhes do NFT | Avaliações": os dados técnicos vêm do próprio NFT. */
export function NftTabs({ nft }: { nft: Nft }) {
  const network = NETWORK_LABELS[nft.network]
  const standard =
    nft.network === 'solana'
      ? 'Token Metaplex verificado'
      : 'Contrato inteligente ERC-721 verificado'
  return (
    <Tabs defaultValue="details" className="gap-0">
      <TabsList className="h-auto w-full justify-start gap-10 rounded-none border-b border-divider bg-transparent p-0">
        <TabsTrigger value="details" className={trigger}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={trigger}>
          Avaliações de colecionadores ({nft.reviewsCount})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="max-w-[72ch] space-y-5 pt-5 text-sm leading-6">
        <p className="text-sand">{nft.description}</p>
        <div>
          <h3 className="font-bold">Rede:</h3>
          <p className="text-sand">
            Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.
          </p>
        </div>
        <div>
          <h3 className="font-bold">Contrato:</h3>
          <p className="text-sand">0x7A42…19E8 • {standard}.</p>
        </div>
        <div>
          <h3 className="font-bold">Direitos autorais:</h3>
          <p className="text-sand">
            Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos
            mercados compatíveis.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="reviews" className="space-y-3 pt-5 text-sm">
        <Rating rating={nft.rating} reviewsCount={nft.reviewsCount} />
        <p className="text-sand">
          Média {nft.rating.toFixed(1)} de 5. Os comentários individuais não fazem parte desta
          demonstração.
        </p>
      </TabsContent>
    </Tabs>
  )
}
