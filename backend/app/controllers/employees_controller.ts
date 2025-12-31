import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { createEmployeeValidator, employeeSearchValidator } from '#validators/employee_management'
import db from '@adonisjs/lucid/services/db'

export default class EmployeesController {
   /**
    * Get all employees for the admin's company
    * GET /api/admin/employees
    */
   async index({ request, response, auth }: HttpContext) {
      const admin = auth?.user!
      const { page, limit, search } = await request.validateUsing(employeeSearchValidator)

      const query = User.query()
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .orderBy('created_at', 'desc')

      if (search) {
         query.where((builder) => {
            builder.where('name', 'like', `%${search}%`)
         })
      }

      const employees = await query.paginate(page ?? 1, limit)

      // ss count, last ss taken
      const employeesWithStats = await Promise.all(
         employees.all().map(async (employee) => {
            const screenshotCount = await db
               .from('screenshots')
               .where('user_id', employee.id)
               .count('* as total')
               .first()

            const lastScreenshot = await db
               .from('screenshots')
               .where('user_id', employee.id)
               .orderBy('captured_at', 'desc')
               .select('captured_at')
               .first()

            return {
               ...employee.toJSON(),
               screenshot_count: screenshotCount?.total || 0,
               last_screenshot_at: lastScreenshot?.captured_at || null,
            }
         })
      )

      return response.ok({
         data: employeesWithStats,
         meta: employees.getMeta(),
      })
   }

   /**
    * Get single employee details
    * GET /api/admin/employees/:id
    */
   async show({ params, response, auth }: HttpContext) {
      const admin = auth?.user!

      const employee = await User.query()
         .where('id', params.id)
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .first()

      if (!employee) {
         return response.notFound({
            error: 'Employee not found',
         })
      }

      const screenshotCount = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .count('* as total')
         .first()

      const lastScreenshot = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .orderBy('captured_at', 'desc')
         .select('captured_at')
         .first()

      return response.ok({
         data: {
            ...employee.toJSON(),
            stats: {
               total_screenshots: screenshotCount?.total || 0,
               last_screenshot_at: lastScreenshot?.captured_at || null,
            },
         },
      })
   }

   /**
    * Create new employee
    * POST /api/admin/employees
    */
   async store({ request, response, auth }: HttpContext) {
      const admin = auth?.user!
      const payload = await request.validateUsing(createEmployeeValidator)

      const existingUser = await User.findBy('email', payload.email)
      if (existingUser) {
         return response.conflict({
            error: 'Email already registered',
         })
      }

      const employee = await User.create({
         companyId: admin.companyId,
         name: payload.name,
         email: payload.email,
         password: payload.password,
         role: 'employee',
         screenshotInterval: payload.screenshotInterval || 10,
      })

      return response.created({
         message: 'Employee created successfully',
         data: employee,
      })
   }

   /**
    * Delete employee
    * DELETE /api/admin/employees/:id
    */
   async destroy({ params, response, auth }: HttpContext) {
      const admin = auth?.user!

      const employee = await User.query()
         .where('id', params.id)
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .first()

      if (!employee) {
         return response.notFound({
            error: 'Employee not found',
         })
      }

      await employee.delete()

      return response.ok({
         message: 'Employee deleted successfully',
      })
   }

   /**
    * Search employees by name
    * GET /api/admin/employees/search
    */
   async search({ request, response, auth }: HttpContext) {
      const admin = auth?.user!
      const { search } = await request.validateUsing(employeeSearchValidator)

      if (!search) {
         return response.ok({
            data: [],
         })
      }

      const employees = await User.query()
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .where('name', 'like', `%${search}%`)
         .orderBy('name', 'asc')
         .limit(10)

      return response.ok({
         data: employees,
      })
   }

   /**
    * Get employee statistics
    * GET /api/admin/employees/:id/stats
    */
   async stats({ params, response, auth }: HttpContext) {
      const admin = auth?.user!

      const employee = await User.query()
         .where('id', params.id)
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .first()

      if (!employee) {
         return response.notFound({
            error: 'Employee not found',
         })
      }

      const totalScreenshots = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .count('* as total')
         .first()

      const screenshotsThisWeek = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .where('captured_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
         .count('* as total')
         .first()

      const screenshotsThisMonth = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .where('captured_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
         .count('* as total')
         .first()

      const lastScreenshot = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .orderBy('captured_at', 'desc')
         .select('captured_at', 'file_path')
         .first()

      const activeDays = await db
         .from('screenshots')
         .where('user_id', employee.id)
         .where('captured_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
         .countDistinct(db.raw('DATE(captured_at)'), 'active_days')
         .first()

      return response.ok({
         data: {
            employee: {
               id: employee.id,
               name: employee.name,
               email: employee.email,
               screenshotInterval: employee.screenshotInterval,
            },
            stats: {
               total_screenshots: totalScreenshots?.total || 0,
               screenshots_this_week: screenshotsThisWeek?.total || 0,
               screenshots_this_month: screenshotsThisMonth?.total || 0,
               active_days_this_month: activeDays?.active_days || 0,
               last_screenshot: lastScreenshot || null,
            },
         },
      })
   }
}
