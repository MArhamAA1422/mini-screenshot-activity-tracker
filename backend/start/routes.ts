import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Public routes
router.get('/api/plans', '#controllers/plans_controller.index')

router
   .group(() => {
      router.post('/signup', '#controllers/auth_controller.signup')
      router.post('/login', '#controllers/auth_controller.login')
   })
   .prefix('/api/auth')

// Protected routes
router
   .group(() => {
      router.get('/me', '#controllers/auth_controller.me')
      router.post('/logout', '#controllers/auth_controller.logout')
      router.post('/logout-all', '#controllers/auth_controller.logoutAll')
      router.post('/refresh', '#controllers/auth_controller.refresh')
   })
   .prefix('/api/auth')
   .use(middleware.auth())

// Employee management
router
   .group(() => {
      router.get('/employees', '#controllers/employees_controller.index')
      router.get('/employees/search', '#controllers/employees_controller.search')
      router.get('/employees/:id', '#controllers/employees_controller.show')

      router.post('/employees', '#controllers/employees_controller.store')
      router.delete('/employees/:id', '#controllers/employees_controller.destroy')

      router.get('/employees/:id/stats', '#controllers/employees_controller.stats')
   })
   .prefix('/api/admin')
   .use(middleware.auth())
   .use(middleware.admin())

// Screenshot
router
   .group(() => {
      router.post('/screenshots', '#controllers/screenshots_controller.upload')
      router.get('/screenshots', '#controllers/screenshots_controller.myScreenshots')
      router.get('/screenshots/file/*', '#controllers/screenshots_controller.serveScreenshotFile')
   })
   .prefix('/api/employee')
   .use(middleware.auth())
   .use(middleware.employee())

router
   .group(() => {
      router.get(
         '/employees/:employeeId/screenshots',
         '#controllers/screenshots_controller.getEmployeeScreenshots'
      )

      router.get(
         '/employees/:employeeId/screenshots/grouped',
         '#controllers/screenshots_controller.getGroupedScreenshots'
      )

      router.get('/screenshots/file/*', '#controllers/screenshots_controller.serveScreenshotFile')
   })
   .prefix('/api/admin')
   .use(middleware.auth())
   .use(middleware.admin())
