import type { ApiErrorCode } from '@/contracts'
import type { ScenarioName } from './names'

export { SCENARIO_NAMES, isScenarioName, type ScenarioName } from './names'

/** Padrão registrado em `route()`, sem o prefixo `/api` (ex.: `'PUT /favorites/:nftId'`). */
export type EndpointId = `${'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'} /${string}`

export type ErrorOverride = {
  status: number
  code: ApiErrorCode
  message?: string
  fieldErrors?: Record<string, string>
}

export type ScenarioConfig = {
  label: string
  description: string
  latency: { min: number; max: number }
  offline?: boolean
  restError?: { status: 503 }
  sessionTtlMs?: number
  settle?: { status: 'confirmed' | 'declined'; afterMs: number } | 'manual'
  overrides?: Partial<Record<EndpointId, 'hang-first' | ErrorOverride>>
  /** Mutação agendada no checkout (1º POST /quotes após conectar a carteira). */
  checkoutMutation?: 'price-change' | 'sold-out'
  /** Cupom pré-aplicado no carrinho da Ana, só para demonstração. */
  prefillCoupon?: string
}

const FAST = { min: 80, max: 200 }
const CONFIRM = { status: 'confirmed', afterMs: 3000 } as const

export const SCENARIOS: Record<ScenarioName, ScenarioConfig> = {
  default: {
    label: 'Padrão',
    description: 'Catálogo completo, latência curta e estável; o pedido confirma em ~3s.',
    latency: FAST,
    settle: CONFIRM,
  },
  'empty-catalog': {
    label: 'Catálogo vazio',
    description: 'A listagem volta sempre vazia.',
    latency: FAST,
    settle: CONFIRM,
  },
  slow: {
    label: 'Rede lenta',
    description: 'Latência alta e fixa (2,5s): os skeletons ficam visíveis.',
    latency: { min: 2500, max: 2500 },
    settle: CONFIRM,
  },
  jitter: {
    label: 'Latência variável',
    description: 'Cada requisição leva de 50ms a 1,5s, gerando respostas fora de ordem.',
    latency: { min: 50, max: 1500 },
    settle: CONFIRM,
  },
  offline: {
    label: 'Sem conexão',
    description: 'O REST falha com erro de rede e o socket não conecta.',
    latency: FAST,
    offline: true,
    settle: CONFIRM,
  },
  'server-errors': {
    label: 'Erros do servidor',
    description:
      'As duas primeiras leituras de cada endpoint respondem 503; o retry manual recupera.',
    latency: FAST,
    restError: { status: 503 },
    settle: CONFIRM,
  },
  'session-expired': {
    label: 'Sessão expira',
    description: 'O token expira 60s após o login (401 SESSION_EXPIRED no meio do fluxo).',
    latency: FAST,
    sessionTtlMs: 60_000,
    settle: CONFIRM,
  },
  'signup-conflict': {
    label: 'E-mail já cadastrado',
    description: 'O cadastro sempre responde 409 EMAIL_TAKEN.',
    latency: FAST,
    settle: CONFIRM,
    overrides: {
      'POST /auth/register': {
        status: 409,
        code: 'EMAIL_TAKEN',
        message: 'Este e-mail já está cadastrado',
        fieldErrors: { email: 'Este e-mail já está cadastrado' },
      },
    },
  },
  'coupon-invalid': {
    label: 'Cupom inválido',
    description: 'O carrinho da Ana começa com um cupom inexistente (422 COUPON_INVALID).',
    latency: FAST,
    settle: CONFIRM,
    prefillCoupon: 'KURIO99',
  },
  'coupon-expired': {
    label: 'Cupom expirado',
    description: 'O carrinho da Ana começa com o cupom LAUNCH20, já expirado (422 COUPON_EXPIRED).',
    latency: FAST,
    settle: CONFIRM,
    prefillCoupon: 'LAUNCH20',
  },
  'price-change-checkout': {
    label: 'Preço muda no checkout',
    description: 'O preço de um item sobe 15% durante o checkout (nft.updated + 409 QUOTE_STALE).',
    latency: FAST,
    settle: CONFIRM,
    checkoutMutation: 'price-change',
  },
  'sold-out-checkout': {
    label: 'Esgota no checkout',
    description: 'Uma edição esgota durante o checkout (nft.updated + 409 AVAILABILITY_CONFLICT).',
    latency: FAST,
    settle: CONFIRM,
    checkoutMutation: 'sold-out',
  },
  'order-timeout': {
    label: 'Timeout do pedido',
    description:
      'O pedido é criado, mas a 1ª resposta nunca chega; o retry com a mesma chave recupera o pedido.',
    latency: FAST,
    settle: CONFIRM,
    overrides: { 'POST /orders': 'hang-first' },
  },
  'wallet-rejected': {
    label: 'Carteira recusada',
    description: 'A conexão da carteira é recusada (409 WALLET_REJECTED).',
    latency: FAST,
    settle: CONFIRM,
    overrides: { 'POST /wallet-sessions': { status: 409, code: 'WALLET_REJECTED' } },
  },
  'payment-confirmed': {
    label: 'Confirmação manual',
    description: 'O pedido só confirma quando o teste (ou o painel) chamar settleOrder.',
    latency: FAST,
    settle: 'manual',
  },
  'payment-declined': {
    label: 'Pagamento recusado',
    description: 'O pedido termina declined após ~3s.',
    latency: FAST,
    settle: { status: 'declined', afterMs: 3000 },
  },
}
