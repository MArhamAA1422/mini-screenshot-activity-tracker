import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import JwtService from '#services/jwt_service'

/**
 * Auth middleware - Validates JWT token from httpOnly cookie
 */
export default class AuthMiddleware {
   async handle(ctx: HttpContext, next: NextFn) {
      const { request, response } = ctx

      try {
         let token = request.cookie('accessToken')

         // Fallback: Get token from Authorization header (for mobile apps/API clients)
         if (!token) {
            const authHeader = request.header('Authorization')
            if (authHeader) {
               token = authHeader.replace('Bearer ', '').trim()
            }
         }

         if (!token) {
            return response.unauthorized({
               error: 'Authentication required',
            })
         }

         const user = await JwtService.validateToken(token)

         ctx.auth = { user }

         const needsRotation = JwtService.needsRotation(token)

         if (needsRotation) {
            // Send header to inform client to refresh token
            response.header('X-Token-Rotation-Required', 'true')
         }

         // Continue to the next middleware or controller
         await next()
      } catch (error) {
         return response.unauthorized({
            error: error.message || 'Invalid or expired token',
         })
      }
   }
}
