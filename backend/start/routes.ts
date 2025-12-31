/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const AuthController = () => import('#controllers/auth_controller')

// Public routes
router
   .group(() => {
      router.post('/signup', [AuthController, 'signup'])
      router.post('/login', [AuthController, 'login'])
   })
   .prefix('/api/auth')

// Protected routes
router
   .group(() => {
      router.get('/me', [AuthController, 'me'])
      router.post('/logout', [AuthController, 'logout'])
      router.post('/logout-all', [AuthController, 'logoutAll'])
      router.post('/refresh', [AuthController, 'refresh'])
   })
   .prefix('/api/auth')
   .use(middleware.auth())
