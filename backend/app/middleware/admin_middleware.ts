import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Admin-only middleware
 * Must be used after AuthMiddleware
 */
export default class AdminMiddleware {
   async handle(ctx: HttpContext, next: NextFn) {
      const { response, auth } = ctx

      if (!auth?.user) {
         return response.unauthorized({
            error: 'Authentication required',
         })
      }

      if (!auth.user.isAdmin()) {
         return response.forbidden({
            error: 'Admin access required',
         })
      }

      await next()
   }
}
