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
      try {
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
      } catch (error) {
         return response.status(500).send({
            error: 'Error in getting employee list',
         })
      }
   }

   /**
    * Create new employee
    * POST /api/admin/employees
    */
   async store({ request, response, auth }: HttpContext) {
      try {
         const admin = auth?.user!
         const payload = await request.validateUsing(createEmployeeValidator)

         const isDuplicateEmail = await User.findBy('email', payload.email)
         if (isDuplicateEmail) {
            return response.conflict({
               error: 'Credentials already exist',
            })
         }

         const employee = await User.create({
            companyId: admin.companyId,
            name: payload.name,
            email: payload.email,
            password: payload.password,
            role: 'employee',
         })

         return response.created({
            message: 'Employee created successfully',
            data: employee,
         })
      } catch (error) {
         return response.status(500).send({
            error: 'Error in employee creation',
         })
      }
   }

   /**
    * Delete employee
    * DELETE /api/admin/employees/:id
    */
   async destroy({ params, response, auth }: HttpContext) {
      try {
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
      } catch (error) {
         return response.status(500).send({
            error: 'Error in employee deletion',
         })
      }
   }

   /**
    * Search employees by name
    * GET /api/admin/employees/search
    */
   async search({ request, response, auth }: HttpContext) {
      try {
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
      } catch (error) {
         return response.status(500).send({
            error: 'Error in employee searching',
         })
      }
   }
}
