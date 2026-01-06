/**
 * Extend AdonisJS HttpContext to include authenticated user
 *
 * This file extends the HttpContext interface to add the 'user' property
 * which will be set by the auth middleware after successful authentication.
 */

import User from '#models/user'

declare module '@adonisjs/core/http' {
   interface HttpContext {
      /**
       * Authenticated user (set by auth middleware)
       */
      auth?: {
         user: User
      }
   }
}
