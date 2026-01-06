// import { defineConfig } from '@adonisjs/auth'
// import { sessionUserProvider } from '@adonisjs/auth/session'
// import { JwtGuard } from '../app/auth/guards/jwt.js'
// import env from '#start/env'

// const userProvider = sessionUserProvider({
//    model: () => import('#models/user'),
// })

// const authConfig = defineConfig({
//    default: 'jwt',
//    guards: {
//       jwt: (ctx) => {
//          return new JwtGuard(ctx, userProvider, {
//             secret: env.get('APP_KEY'),
//             accessTokenExpiresIn: '24h',
//             refreshTokenExpiresIn: '7d',
//          })
//       },
//    },
// })

// export default authConfig

// declare module '@adonisjs/auth/types' {
//    export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
// }
