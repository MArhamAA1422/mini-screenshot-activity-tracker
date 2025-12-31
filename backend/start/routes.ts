import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const ScreenshotsController = () => import('#controllers/screenshots_controller')
const EmployeesController = () => import('#controllers/employees_controller')
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

// Employee management
router
   .group(() => {
      router.get('/employees', [EmployeesController, 'index'])
      router.get('/employees/search', [EmployeesController, 'search'])
      router.get('/employees/:id', [EmployeesController, 'show'])

      router.post('/employees', [EmployeesController, 'store'])
      router.delete('/employees/:id', [EmployeesController, 'destroy'])

      router.get('/employees/:id/stats', [EmployeesController, 'stats'])
   })
   .prefix('/api/admin')
   .use(middleware.auth())
   .use(middleware.admin())

// Screenshot

router
   .group(() => {
      router.post('/screenshots', [ScreenshotsController, 'upload'])
      router.get('/screenshots', [ScreenshotsController, 'myScreenshots'])
   })
   .prefix('/api/employee')
   .use(middleware.auth())
   .use(middleware.employee())

router
   .group(() => {
      router.get('/employees/:employeeId/screenshots', [
         ScreenshotsController,
         'getEmployeeScreenshots',
      ])

      router.get('/employees/:employeeId/screenshots/grouped', [
         ScreenshotsController,
         'getGroupedScreenshots',
      ])
   })
   .prefix('/api/admin')
   .use(middleware.auth())
   .use(middleware.admin())
