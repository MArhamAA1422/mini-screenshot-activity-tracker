import { symbols, errors } from '@adonisjs/auth'
import { AuthClientResponse, GuardContract } from '@adonisjs/auth/types'
import type { HttpContext } from '@adonisjs/core/http'
import jwt, { SignOptions, Secret } from 'jsonwebtoken'
import { DateTime } from 'luxon'
import RefreshToken from '#models/refresh_token'
import crypto from 'node:crypto'

/**
 * The bridge between the User provider and the Guard
 */
export type JwtGuardUser<RealUser> = {
   getId(): string | number | BigInt
   getOriginal(): RealUser
}

/**
 * The interface for the UserProvider accepted by the JWT guard
 */
export interface JwtUserProviderContract<RealUser> {
   [symbols.PROVIDER_REAL_USER]: RealUser
   createUserForGuard(user: RealUser): Promise<JwtGuardUser<RealUser>>
   findById(identifier: string | number | BigInt): Promise<JwtGuardUser<RealUser> | null>
}

/**
 * Configuration options for JWT Guard
 */
export type JwtGuardOptions = {
   secret: string
   accessTokenExpiresIn: string
   refreshTokenExpiresIn: string
}

/**
 * Payload stored in JWT tokens
 */
type TokenPayload = {
   userId: number | string | BigInt
   type: 'access' | 'refresh'
}

/**
 * Response from token generation
 */
export type TokenResponse = {
   type: 'bearer'
   accessToken: string
   refreshToken: string
   expiresIn: number // seconds
}

/**
 * JWT Guard implementation with access and refresh tokens
 */
export class JwtGuard<
   UserProvider extends JwtUserProviderContract<unknown>,
> implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
   /**
    * A list of events and their types emitted by the guard
    */
   declare [symbols.GUARD_KNOWN_EVENTS]: {}

   /**
    * A unique name for the guard driver
    */
   driverName: 'jwt' = 'jwt'

   /**
    * A flag to know if authentication was attempted during the current HTTP request
    */
   authenticationAttempted: boolean = false

   /**
    * A boolean to know if the current request has been authenticated
    */
   isAuthenticated: boolean = false

   /**
    * Reference to the currently authenticated user
    */
   user?: UserProvider[typeof symbols.PROVIDER_REAL_USER]

   #ctx: HttpContext
   #userProvider: UserProvider
   #options: JwtGuardOptions

   constructor(ctx: HttpContext, userProvider: UserProvider, options: JwtGuardOptions) {
      this.#ctx = ctx
      this.#userProvider = userProvider
      this.#options = options
   }

   hashToken(token: string): string {
      return crypto.createHash('sha256').update(token).digest('hex')
   }

   /**
    * Generate access and refresh tokens for a given user
    */
   async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]): Promise<TokenResponse> {
      const providerUser = await this.#userProvider.createUserForGuard(user)
      const userId = providerUser.getId()

      const secret = this.#options.secret as Secret

      const accessTokenOptions: SignOptions = {
         expiresIn: this.#options.accessTokenExpiresIn as SignOptions['expiresIn'],
      }

      const accessToken = jwt.sign(
         {
            userId,
            type: 'access',
         } as TokenPayload,
         secret,
         accessTokenOptions
      )

      const refreshTokenOptions: SignOptions = {
         expiresIn: this.#options.refreshTokenExpiresIn as SignOptions['expiresIn'],
      }

      const refreshToken = jwt.sign(
         {
            userId,
            type: 'refresh',
         } as TokenPayload,
         secret,
         refreshTokenOptions
      )

      // Store refresh token in database
      const expiresAt = this.#calculateExpiryDate(this.#options.refreshTokenExpiresIn)
      await RefreshToken.create({
         userId: userId as number,
         token: this.hashToken(refreshToken),
         expiresAt,
         userAgent: this.#ctx.request.header('user-agent'),
         ipAddress: this.#ctx.request.ip(),
      })

      const decoded = jwt.decode(accessToken) as { exp: number }
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000)

      return {
         type: 'bearer',
         accessToken,
         refreshToken,
         expiresIn,
      }
   }

   /**
    * Authenticate the current HTTP request using access token
    */
   async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
      // Avoid re-authentication when it has been done already
      if (this.authenticationAttempted) {
         return this.getUserOrFail()
      }

      this.authenticationAttempted = true

      const authHeader = this.#ctx.request.header('authorization')
      if (!authHeader) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
            guardDriverName: this.driverName,
         })
      }

      const [, token] = authHeader.split('Bearer ')
      if (!token) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
            guardDriverName: this.driverName,
         })
      }

      let payload: TokenPayload
      try {
         payload = jwt.verify(token, this.#options.secret) as TokenPayload
      } catch (error) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Invalid or expired token', {
            guardDriverName: this.driverName,
         })
      }

      if (payload.type !== 'access') {
         throw new errors.E_UNAUTHORIZED_ACCESS('Invalid token type', {
            guardDriverName: this.driverName,
         })
      }

      const providerUser = await this.#userProvider.findById(payload.userId)
      if (!providerUser) {
         throw new errors.E_UNAUTHORIZED_ACCESS('User not found', {
            guardDriverName: this.driverName,
         })
      }

      this.isAuthenticated = true
      this.user = providerUser.getOriginal()
      return this.getUserOrFail()
   }

   /**
    * Refresh access token using refresh token
    */
   async refresh(refreshTokenString: string): Promise<TokenResponse> {
      let payload: TokenPayload
      try {
         payload = jwt.verify(refreshTokenString, this.#options.secret) as TokenPayload
      } catch (error) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Invalid or expired refresh token', {
            guardDriverName: this.driverName,
         })
      }

      if (payload.type !== 'refresh') {
         throw new errors.E_UNAUTHORIZED_ACCESS('Invalid token type', {
            guardDriverName: this.driverName,
         })
      }

      const storedToken = await RefreshToken.query()
         .where('token', this.hashToken(refreshTokenString))
         .where('user_id', payload.userId as number)
         .where('revoked', false)
         .first()

      if (!storedToken) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Refresh token not found or revoked', {
            guardDriverName: this.driverName,
         })
      }

      if (storedToken && storedToken.revoked) {
         await RefreshToken.query()
            .where('user_id', payload.userId as number)
            .update({ revoked: true })

         throw new errors.E_UNAUTHORIZED_ACCESS(
            'Refresh token reuse detected. Session invalidated.',
            { guardDriverName: this.driverName }
         )
      }

      if (!storedToken) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Refresh token not found', {
            guardDriverName: this.driverName,
         })
      }

      if (storedToken.expiresAt < DateTime.now()) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Refresh token expired', {
            guardDriverName: this.driverName,
         })
      }

      const providerUser = await this.#userProvider.findById(payload.userId)
      if (!providerUser) {
         throw new errors.E_UNAUTHORIZED_ACCESS('User not found', {
            guardDriverName: this.driverName,
         })
      }

      storedToken.revoked = true
      await storedToken.save()

      return this.generate(providerUser.getOriginal())
   }

   /**
    * Logout user by revoking refresh token
    */
   async logout(refreshTokenString?: string): Promise<void> {
      if (refreshTokenString) {
         await RefreshToken.query()
            .where('token', this.hashToken(refreshTokenString))
            .update({ revoked: true })
      } else if (this.user) {
         const providerUser = await this.#userProvider.createUserForGuard(this.user)
         await RefreshToken.query()
            .where('user_id', providerUser.getId() as number)
            .update({ revoked: true })
      }

      this.user = undefined
      this.isAuthenticated = false
   }

   /**
    * Logout from all devices (revoke all refresh tokens)
    */
   async logoutAll(): Promise<void> {
      if (this.user) {
         const providerUser = await this.#userProvider.createUserForGuard(this.user)
         await RefreshToken.query()
            .where('user_id', providerUser.getId() as number)
            .update({ revoked: true })
      }

      this.user = undefined
      this.isAuthenticated = false
   }

   /**
    * Clean up expired refresh tokens for a user
    */
   static async cleanupExpiredTokens(userId: number): Promise<void> {
      await RefreshToken.query()
         .where('user_id', userId)
         .where('expires_at', '<', DateTime.now().toJSDate())
         .delete()
   }

   /**
    * Same as authenticate, but does not throw an exception
    */
   async check(): Promise<boolean> {
      try {
         await this.authenticate()
         return true
      } catch {
         return false
      }
   }

   /**
    * Returns the authenticated user or throws an error
    */
   getUserOrFail(): UserProvider[typeof symbols.PROVIDER_REAL_USER] {
      if (!this.user) {
         throw new errors.E_UNAUTHORIZED_ACCESS('Unauthorized access', {
            guardDriverName: this.driverName,
         })
      }
      return this.user
   }

   /**
    * This method is called by Japa during testing when "loginAs" method is used
    */
   async authenticateAsClient(
      user: UserProvider[typeof symbols.PROVIDER_REAL_USER]
   ): Promise<AuthClientResponse> {
      const tokens = await this.generate(user)
      return {
         headers: {
            authorization: `Bearer ${tokens.accessToken}`,
         },
      }
   }

   /**
    * Calculate expiry date from string like '15m', '7d', '30d'
    */
   #calculateExpiryDate(expiresIn: string): DateTime {
      const match = expiresIn.match(/^(\d+)([smhd])$/)
      if (!match) {
         throw new Error(`Invalid expiresIn format: ${expiresIn}`)
      }

      const [, amount, unit] = match
      const duration = Number.parseInt(amount, 10)

      switch (unit) {
         case 's':
            return DateTime.now().plus({ seconds: duration })
         case 'm':
            return DateTime.now().plus({ minutes: duration })
         case 'h':
            return DateTime.now().plus({ hours: duration })
         case 'd':
            return DateTime.now().plus({ days: duration })
         default:
            throw new Error(`Invalid time unit: ${unit}`)
      }
   }
}
