import { NftSchema, type Nft } from '@/contracts'
import { request } from '@/shared/lib/http'

export function fetchNft(id: string, signal?: AbortSignal): Promise<Nft> {
  return request(NftSchema, { url: `/nfts/${encodeURIComponent(id)}`, signal })
}
