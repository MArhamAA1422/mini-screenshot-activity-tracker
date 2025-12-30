import env from '#start/env'

const authConfig = {
   jwt: {
      secret: env.get('JWT_SECRET'),
      expiresIn: env.get('JWT_EXPIRES_IN', '24h'),
      algorithm: 'HS256',
   },

   tokenRotation: {
      enabled: true,
      interval: 24, // hours - rotate tokens every 24 hours
      gracePeriod: 15, // minutes - allow old tokens to work for 15 minutes after rotation
   },

   password: {
      minLength: 4,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
   },
}

export default authConfig
