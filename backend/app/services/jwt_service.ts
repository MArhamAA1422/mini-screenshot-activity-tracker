import jwt from 'jsonwebtoken'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'
import User from '#models/user'
import AuthToken from '#models/auth_token'

interface JwtPayload {
   userId: number
   role: 'admin' | 'employee'
   companyId: number
   iat?: number
   exp?: number
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
   static async generateToken(
      user: User,
      ipAddress?: string,
      userAgent?: string
   ): Promise<TokenResponse> {
      const payload: JwtPayload = {
         userId: user.id,
         role: user.role,
         companyId: user.companyId,
      }

      const token = jwt.sign(payload, env.get('JWT_SECRET'), {
         expiresIn: '24h',
         algorithm: 'HS256',
      })

      const expiresAt = DateTime.now().plus({ hours: 24 })

      const tokenHash = await hash.make(token)

      await AuthToken.create({
         userId: user.id,
         tokenHash,
         expiresAt,
         ipAddress,
         userAgent,
         isRevoked: false,
      })

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
    * Verify and decode a JWT token
    */
   static verifyToken(token: string): JwtPayload {
      try {
         const decoded = jwt.verify(token, env.get('JWT_SECRET'), {
            algorithms: ['HS256'],
         }) as JwtPayload

         return decoded
      } catch (error) {
         throw new Error('Invalid or expired token')
      }
   }

   /**
    * Validate token against database and check if needs rotation
    */
   static async validateToken(
      token: string,
      ipAddress?: string,
      userAgent?: string
   ): Promise<{
      user: User
      authToken: AuthToken
      needsRotation: boolean
   }> {
      const payload = this.verifyToken(token)

      const user = await User.query().where('id', payload.userId).preload('company').firstOrFail()

      const authTokens = await AuthToken.query()
         .where('user_id', user.id)
         .where('is_revoked', false)
         .orderBy('created_at', 'desc')

      let matchedToken: AuthToken | null = null

      for (const dbToken of authTokens) {
         const isMatch = await hash.verify(dbToken.tokenHash, token)
         if (isMatch) {
            matchedToken = dbToken
            break
         }
      }

      if (!matchedToken) {
         throw new Error('Token not found or has been revoked')
      }

      if (!matchedToken.isValid()) {
         throw new Error('Token has expired or been revoked')
      }

      await matchedToken.updateLastUsed(ipAddress, userAgent)

      const needsRotation = matchedToken.needsRotation()

      return {
         user,
         authToken: matchedToken,
         needsRotation,
      }
   }

   /**
    * Rotate an existing token
    */
   static async rotateToken(
      oldToken: string,
      ipAddress?: string,
      userAgent?: string
   ): Promise<TokenResponse> {
      const { user, authToken } = await this.validateToken(oldToken, ipAddress, userAgent)

      await authToken.markAsRotated()

      const newTokenResponse = await this.generateToken(user, ipAddress, userAgent)

      return newTokenResponse
   }

   /**
    * Revoke a token (logout)
    */
   static async revokeToken(token: string): Promise<void> {
      const payload = this.verifyToken(token)

      const authTokens = await AuthToken.query()
         .where('user_id', payload.userId)
         .where('is_revoked', false)

      for (const dbToken of authTokens) {
         const isMatch = await hash.verify(dbToken.tokenHash, token)
         if (isMatch) {
            await dbToken.revoke()
            break
         }
      }
   }

   /**
    * Revoke all tokens for a user (logout all devices)
    */
   static async revokeAllUserTokens(userId: number): Promise<void> {
      await AuthToken.revokeUserTokens(userId)
   }

   /**
    * Check if token is in grace period after rotation
    */
   static async isTokenInGracePeriod(token: string): Promise<boolean> {
      try {
         const { authToken } = await this.validateToken(token)
         return authToken.isInGracePeriod()
      } catch {
         return false
      }
   }

   /**
    * Cleanup expired tokens (run as cron job)
    */
   static async cleanupExpiredTokens(): Promise<number> {
      return AuthToken.cleanupExpiredTokens()
   }
}
