import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Employee-only middleware
 * Must be used after AuthMiddleware
 */
export default class EmployeeMiddleware {
   async handle(ctx: HttpContext, next: NextFn) {
      const { response, auth } = ctx

      if (!auth?.user) {
         return response.unauthorized({
            error: 'Authentication required',
         })
      }

      if (!auth.user.isEmployee()) {
         return response.forbidden({
            error: 'Employee access required',
         })
      }

      await next()
   }
}
