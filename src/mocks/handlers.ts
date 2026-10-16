import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers } from './handlers/catalog'
import { favoritesHandlers } from './handlers/favorites'
import { orderHandlers } from './handlers/orders'
import { profileHandlers } from './handlers/profile'
import { quoteHandlers } from './handlers/quotes'
import { walletSessionHandlers } from './handlers/wallet-sessions'
import { walletHandlers } from './handlers/wallets'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...walletHandlers,
  ...walletSessionHandlers,
  ...orderHandlers,
  ...profileHandlers,
]
