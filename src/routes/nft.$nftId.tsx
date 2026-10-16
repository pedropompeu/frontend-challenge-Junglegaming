import { createFileRoute, Link } from '@tanstack/react-router'

/** Placeholder até a Task 12 (detalhe do NFT). */
export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  return (
    <div className="page-container py-10">
      <h1 className="text-2xl font-bold">{nftId}</h1>
      <Link to="/" className="mt-4 inline-block text-primary-hi underline">
        Voltar ao Início
      </Link>
    </div>
  )
}
