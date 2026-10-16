import { authHandlers } from './handlers/auth'
import { catalogHandlers } from './handlers/catalog'
import { favoritesHandlers } from './handlers/favorites'

export const handlers = [...authHandlers, ...catalogHandlers, ...favoritesHandlers]
