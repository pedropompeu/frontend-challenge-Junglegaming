import { QuoteSchema, type Quote, type QuoteRequest } from '@/contracts'
import { request } from '@/shared/lib/http'

export function createQuote(req: QuoteRequest, signal?: AbortSignal): Promise<Quote> {
  return request(QuoteSchema, { method: 'POST', url: '/quotes', data: req, signal })
}
