import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Company from '#models/company'
import Plan from '#models/plan'
import JwtService from '#services/jwt_service'
import hash from '@adonisjs/core/services/hash'
import { companySignupValidator } from '#validators/company_signup'
import { loginValidator } from '#validators/login'

export default class AuthController {
   /**
    * Signup (Register new company + admin)
    * POST /api/auth/signup
    */
   async signup({ request, response }: HttpContext) {
      try {
         const data = await request.validateUsing(companySignupValidator)

         // Check if email already exists
         const existingUser = await User.query().where('email', data.ownerEmail).first()
         if (existingUser) {
            return response.conflict({
               error: 'Email already registered',
            })
         }

         // Get plan
         const plan = await Plan.findOrFail(data.planId)

         // Create company
         const company = await Company.create({
            name: data.companyName,
            planId: plan.id,
         })

         // Create admin user
         const user = await User.create({
            name: data.ownerName,
            email: data.ownerEmail,
            password: data.password, // Will be hashed by User model
            role: 'admin',
            companyId: company.id,
         })

         // Generate tokens
         const tokenResponse = JwtService.generateToken(user)
         const refreshToken = JwtService.generateRefreshToken(user)

         // Set tokens in httpOnly cookies
         this.setAuthCookies(response, tokenResponse.token, refreshToken)

         return response.created({
            message: 'Account created successfully',
            data: {
               user: tokenResponse.user,
               expiresAt: tokenResponse.expiresAt,
            },
         })
      } catch (error) {
         return response.badRequest({
            error: error.messages || error.message || 'Signup failed',
         })
      }
   }

   /**
    * Login
    * POST /api/auth/login
    */
   async login({ request, response }: HttpContext) {
      try {
         const { email, password } = await request.validateUsing(loginValidator)

         // Find user
         const user = await User.query().where('email', email).preload('company').firstOrFail()

         // Verify password
         const isPasswordValid = await hash.verify(user.password, password)

         if (!isPasswordValid) {
            return response.unauthorized({
               error: 'Invalid credentials',
            })
         }

         // Generate tokens
         const tokenResponse = JwtService.generateToken(user)
         const refreshToken = JwtService.generateRefreshToken(user)

         // Set tokens in httpOnly cookies
         this.setAuthCookies(response, tokenResponse.token, refreshToken)

         return response.ok({
            message: 'Login successful',
            data: {
               user: tokenResponse.user,
               expiresAt: tokenResponse.expiresAt,
            },
         })
      } catch (error) {
         return response.unauthorized({
            error: 'Invalid credentials',
         })
      }
   }

   /**
    * Get current user
    * GET /api/auth/me
    */
   async me({ auth, response }: HttpContext) {
      try {
         // User is already attached by auth middleware
         const user = auth?.user

         if (!user) {
            return response.unauthorized({
               error: 'User not found',
            })
         }

         // Load company if not already loaded
         if (!user.company) {
            await user.load('company')
         }

         return response.ok({
            data: {
               id: user.id,
               name: user.name,
               email: user.email,
               role: user.role,
               companyId: user.companyId,
               company: user.company
                  ? {
                       id: user.company.id,
                       name: user.company.name,
                    }
                  : null,
            },
         })
      } catch (error) {
         return response.unauthorized({
            error: 'Failed to fetch user data',
         })
      }
   }

   /**
    * Refresh access token
    * POST /api/auth/refresh
    */
   async refresh({ request, response }: HttpContext) {
      try {
         // Get refresh token from httpOnly cookie
         const refreshToken = request.cookie('refreshToken')

         if (!refreshToken) {
            return response.unauthorized({
               error: 'Refresh token not found',
            })
         }

         // Generate new access token using refresh token
         const tokenResponse = await JwtService.refreshAccessToken(refreshToken)

         // Generate new refresh token (rotate)
         const newRefreshToken = JwtService.generateRefreshToken(
            await User.findOrFail(tokenResponse.user.id)
         )

         // Set new tokens in httpOnly cookies
         this.setAuthCookies(response, tokenResponse.token, newRefreshToken)

         return response.ok({
            message: 'Token refreshed successfully',
         })
      } catch (error) {
         // Clear invalid cookies
         this.clearAuthCookies(response)

         return response.unauthorized({
            error: error.message || 'Failed to refresh token',
         })
      }
   }

   /**
    * Logout
    * POST /api/auth/logout
    */
   async logout({ response }: HttpContext) {
      // Clear httpOnly cookies
      this.clearAuthCookies(response)

      return response.ok({
         message: 'Logout successful',
      })
   }

   /**
    * Logout all devices
    * POST /api/auth/logout-all
    */
   async logoutAll({ response }: HttpContext) {
      // Clear current device cookies
      this.clearAuthCookies(response)

      return response.ok({
         message:
            'Logged out from current device. Note: Other devices will remain logged in until tokens expire (24 hours).',
      })
   }

   /**
    * Set authentication cookies (httpOnly, secure)
    * @private
    */
   private setAuthCookies(
      response: HttpContext['response'],
      accessToken: string,
      refreshToken: string
   ): void {
      // Access token cookie (24 hours)
      response.cookie('accessToken', accessToken, {
         httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
         secure: process.env.NODE_ENV === 'production', // HTTPS only in production
         sameSite: 'lax', // CSRF protection
         maxAge: 24 * 60 * 60, // 24 hours in seconds
         path: '/',
      })

      // Refresh token cookie (7 days)
      response.cookie('refreshToken', refreshToken, {
         httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
         secure: process.env.NODE_ENV === 'production', // HTTPS only in production
         sameSite: 'lax', // CSRF protection
         maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
         path: '/',
      })
   }

   /**
    * Clear authentication cookies
    * @private
    */
   private clearAuthCookies(response: HttpContext['response']): void {
      response.clearCookie('accessToken')
      response.clearCookie('refreshToken')
   }
}
