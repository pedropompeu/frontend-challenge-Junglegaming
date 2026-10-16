import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers } from './handlers/catalog'
import { favoritesHandlers } from './handlers/favorites'
import { quoteHandlers } from './handlers/quotes'

export const handlers = [...authHandlers, ...catalogHandlers, ...favoritesHandlers, ...cartHandlers, ...quoteHandlers]
