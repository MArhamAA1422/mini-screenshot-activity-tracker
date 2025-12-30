import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import JwtService from '#services/jwt_service'
import User from '#models/user'

/**
 * Auth middleware to protect routes
 * Validates JWT token and attaches user to context
 */
export default class AuthMiddleware {
   async handle(ctx: HttpContext, next: NextFn) {
      const { request, response } = ctx

      // Get token from Authorization header
      const authHeader = request.header('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return response.unauthorized({
            error: 'Authorization token required',
         })
      }

      const token = authHeader.replace('Bearer ', '')

      try {
         const ipAddress = request.ip()
         const userAgent = request.header('user-agent')

         const { user, authToken, needsRotation } = await JwtService.validateToken(
            token,
            ipAddress,
            userAgent
         )

         ctx.auth = {
            user,
            token: authToken,
         }

         // If token needs rotation, add header to inform client
         if (needsRotation) {
            response.header('X-Token-Rotation-Required', 'true')
         }

         await next()
      } catch (error) {
         return response.unauthorized({
            error: error.message || 'Invalid or expired token',
         })
      }
   }
}

/**
 * Admin-only middleware
 * Must be used after AuthMiddleware
 */
export class AdminMiddleware {
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

/**
 * Employee-only middleware
 * Must be used after AuthMiddleware
 */
export class EmployeeMiddleware {
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

/**
 * Extend HttpContext to include auth property
 */
declare module '@adonisjs/core/http' {
   interface HttpContext {
      auth?: {
         user: User
         token: any
      }
   }
}
