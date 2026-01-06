import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'
import env from '#start/env'
import User from '#models/user'

interface JwtPayload {
   userId: number
   role: 'admin' | 'employee'
   companyId: number
   iat?: number // Issued at
   exp?: number // Expiration
}

interface TokenResponse {
   token: string
   expiresAt: DateTime
   user: {
      id: number
      name: string
      email: string
      role: string
      companyId: number
   }
}

export default class JwtService {
   // Token expiry times
   private static readonly ACCESS_TOKEN_EXPIRY = '24h'
   private static readonly REFRESH_TOKEN_EXPIRY = '7d'

   /**
    * Generate access token (stateless)
    */
   static generateToken(user: User): TokenResponse {
      const payload: JwtPayload = {
         userId: user.id,
         role: user.role,
         companyId: user.companyId,
      }

      const token = jwt.sign(payload, env.get('JWT_SECRET'), {
         expiresIn: this.ACCESS_TOKEN_EXPIRY,
         algorithm: 'HS256',
      })

      const expiresAt = DateTime.now().plus({ hours: 24 })

      return {
         token,
         expiresAt,
         user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
         },
      }
   }

   /**
    * Generate refresh token (stateless)
    */
   static generateRefreshToken(user: User): string {
      const payload: JwtPayload = {
         userId: user.id,
         role: user.role,
         companyId: user.companyId,
      }

      const refreshToken = jwt.sign(payload, env.get('JWT_SECRET'), {
         expiresIn: this.REFRESH_TOKEN_EXPIRY,
         algorithm: 'HS256',
      })

      return refreshToken
   }

   /**
    * Verify and decode access token
    */
   static verifyToken(token: string): JwtPayload {
      try {
         const decoded = jwt.verify(token, env.get('JWT_SECRET'), {
            algorithms: ['HS256'],
         }) as JwtPayload

         return decoded
      } catch (error) {
         if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired')
         } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token')
         } else {
            throw new Error('Token verification failed')
         }
      }
   }

   /**
    * Verify refresh token
    */
   static verifyRefreshToken(refreshToken: string): JwtPayload {
      try {
         const decoded = jwt.verify(refreshToken, env.get('JWT_SECRET'), {
            algorithms: ['HS256'],
         }) as JwtPayload

         return decoded
      } catch (error) {
         if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token has expired')
         } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token')
         } else {
            throw new Error('Refresh token verification failed')
         }
      }
   }

   /**
    * Validate token and get user (stateless)
    */
   static async validateToken(token: string): Promise<User> {
      try {
         const payload = this.verifyToken(token)

         const user = await User.query()
            .where('id', payload.userId)
            .preload('company')
            .firstOrFail()

         if (!user) {
            throw new Error('User not found')
         }

         return user
      } catch (error) {
         throw error
      }
   }

   /**
    * Refresh access token using refresh token (stateless)
    */
   static async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
      try {
         const payload = this.verifyRefreshToken(refreshToken)

         const user = await User.query()
            .where('id', payload.userId)
            .preload('company')
            .firstOrFail()

         if (!user) {
            throw new Error('User not found')
         }

         // Generate new access token
         const newTokenResponse = this.generateToken(user)

         return newTokenResponse
      } catch (error) {
         throw error
      }
   }

   /**
    * Decode token without verification (for debugging)
    */
   static decodeToken(token: string): JwtPayload | null {
      try {
         const decoded = jwt.decode(token) as JwtPayload
         return decoded
      } catch (error) {
         return null
      }
   }

   /**
    * Check if token is expired (without verification)
    */
   static isTokenExpired(token: string): boolean {
      try {
         const decoded = this.decodeToken(token)
         if (!decoded || !decoded.exp) {
            return true
         }

         const currentTime = Math.floor(Date.now() / 1000)
         return decoded.exp < currentTime
      } catch (error) {
         return true
      }
   }

   /**
    * Get token expiry time
    */
   static getTokenExpiry(token: string): DateTime | null {
      try {
         const decoded = this.decodeToken(token)
         if (!decoded || !decoded.exp) {
            return null
         }

         return DateTime.fromSeconds(decoded.exp)
      } catch (error) {
         return null
      }
   }

   /**
    * Check if token needs rotation (less than 1 hour remaining)
    */
   static needsRotation(token: string): boolean {
      try {
         const decoded = this.decodeToken(token)
         if (!decoded || !decoded.exp) {
            return false
         }

         const currentTime = Math.floor(Date.now() / 1000)
         const timeRemaining = decoded.exp - currentTime

         // Needs rotation if less than 1 hour remaining
         return timeRemaining < 3600 && timeRemaining > 0
      } catch (error) {
         return false
      }
   }
}
