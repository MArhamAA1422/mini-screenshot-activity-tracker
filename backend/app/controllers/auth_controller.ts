import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Company from '#models/company'
import Plan from '#models/plan'
import JwtService from '#services/jwt_service'
import { companySignupValidator } from '#validators/company_signup'
import { loginValidator } from '#validators/login'
import db from '@adonisjs/lucid/services/db'

export default class AuthController {
   /**
    * Company signup - Creates company and owner (admin) account
    * POST /api/auth/signup
    */
   async signup({ request, response }: HttpContext) {
      const payload = await request.validateUsing(companySignupValidator)

      const trx = await db.transaction()

      try {
         const isDuplicateEmail = await User.findBy('email', payload.ownerEmail)
         if (isDuplicateEmail) {
            return response.conflict({
               error: 'Email already registered',
            })
         }

         let plan = await Plan.find(payload.planId)
         if (!plan) {
            plan = await Plan.query().first()
         }

         const company = await Company.create(
            {
               name: payload.companyName,
               planId: payload.planId,
            },
            { client: trx }
         )

         const owner = await User.create(
            {
               companyId: company.id,
               name: payload.ownerName,
               email: payload.ownerEmail,
               password: payload.password,
               role: 'admin',
               screenshotInterval: 10,
            },
            { client: trx }
         )

         await trx.commit()

         // const ipAddress = request.ip()
         // const userAgent = request.header('user-agent')
         const tokenResponse = await JwtService.generateToken(owner)

         return response.created({
            message: 'Company and Admin registered successfully',
            data: tokenResponse,
         })
      } catch (error) {
         await trx.rollback()
         throw error
      }
   }

   /**
    * Login - Both admin and employees
    * POST /api/auth/login
    */
   async login({ request, response }: HttpContext) {
      const payload = await request.validateUsing(loginValidator)

      const user = await User.verifyCredentials(payload.email, payload.password)

      if (!user) {
         return response.unauthorized({
            error: 'Invalid credentials',
         })
      }

      // Generate JWT token
      // const ipAddress = request.ip()
      // const userAgent = request.header('user-agent')
      const tokenResponse = await JwtService.generateToken(user)

      return response.ok({
         message: 'Login successful',
         data: tokenResponse,
      })
   }

   /**
    * Logout - Revoke current token
    * POST /api/auth/logout
    */
   async logout({ request, response }: HttpContext) {
      const token = request.header('authorization')?.replace('Bearer ', '')

      if (!token) {
         return response.badRequest({
            error: 'No token provided',
         })
      }

      await JwtService.revokeToken(token)

      return response.ok({
         message: 'Logged out successfully',
      })
   }

   /**
    * Logout from all devices - Revoke all user tokens
    * POST /api/auth/logout-all
    */
   async logoutAll({ response, auth }: HttpContext) {
      const user = auth?.user!

      await JwtService.revokeAllUserTokens(user.id)

      return response.ok({
         message: 'Logged out from all devices',
      })
   }

   /**
    * Get current authenticated user
    * GET /api/auth/me
    */
   async me({ response, auth }: HttpContext) {
      const user = auth?.user!

      await user.load('company', (query) => {
         query.preload('plan')
      })

      return response.ok({
         data: {
            id: user.id,
            name: user.name,
            role: user.role,
            screenshotInterval: user.screenshotInterval,
            company: {
               id: user.company.id,
               name: user.company.name,
               plan: {
                  id: user.company.plan.id,
                  name: user.company.plan.name,
                  pricePerEmployee: user.company.plan.pricePerEmployee,
               },
            },
         },
      })
   }

   /**
    * Refresh token (if needed rotation)
    * POST /api/auth/refresh
    */
   async refresh({ request, response }: HttpContext) {
      const token = request.header('authorization')?.replace('Bearer ', '')

      if (!token) {
         return response.badRequest({
            error: 'No token provided',
         })
      }

      try {
         const ipAddress = request.ip()
         const userAgent = request.header('user-agent')

         const newTokenResponse = await JwtService.rotateToken(token, ipAddress, userAgent)

         return response.ok({
            message: 'Token refreshed successfully',
            data: newTokenResponse,
         })
      } catch (error) {
         return response.unauthorized({
            error: 'Invalid or expired token',
         })
      }
   }
}
