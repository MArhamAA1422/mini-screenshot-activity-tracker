import type { HttpContext } from '@adonisjs/core/http'
import Screenshot from '#models/screenshot'
import ScreenshotService from '#services/screenshot_service'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { employeeSearchValidator } from '#validators/employee_management'

export default class ScreenshotsController {
   /**
    * Upload screenshot (Employee only)
    * POST /api/employee/screenshots
    */
   async upload({ request, response, auth }: HttpContext) {
      const employee = auth?.user!

      // Get screenshot file from multipart
      const screenshot = request.file('screenshot', {
         size: '5mb',
         extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })

      if (!screenshot) {
         return response.badRequest({
            error: 'Screenshot file is required',
         })
      }

      const capturedAtString = request.input('capturedAt')
      let capturedAt: DateTime | undefined

      if (capturedAtString) {
         capturedAt = DateTime.fromISO(capturedAtString)
         if (!capturedAt.isValid) {
            return response.badRequest({
               error: 'Invalid capturedAt format. Use ISO 8601 (e.g., 2025-12-30T15:30:00)',
            })
         }
      }

      try {
         const metadata = await ScreenshotService.uploadScreenshot(
            screenshot,
            employee.companyId,
            employee.id,
            capturedAt
         )

         // Save to database
         const screenshotRecord = await Screenshot.create({
            companyId: employee.companyId,
            userId: employee.id,
            filePath: metadata.filePath,
            capturedAt: metadata.capturedAt,
            uploadedAt: DateTime.now(),
            hour: metadata.capturedAt.hour,
            minuteBucket: Screenshot.calculateMinuteBucket(
               metadata.capturedAt.minute,
               employee.screenshotInterval
            ),
         })

         return response.created({
            message: 'Screenshot uploaded successfully',
            data: {
               id: screenshotRecord.id,
               filePath: screenshotRecord.filePath,
               fileUrl: screenshotRecord.getFileUrl(),
               capturedAt: screenshotRecord.capturedAt.toISO(),
               uploadedAt: screenshotRecord.uploadedAt.toISO(),
               hour: screenshotRecord.hour,
               minuteBucket: screenshotRecord.minuteBucket,
            },
         })
      } catch (error) {
         return response.internalServerError({
            error: 'Failed to upload screenshot',
            details: error.message,
         })
      }
   }

   /**
    * Get employee's own screenshots
    * GET /api/employee/screenshots
    */
   async myScreenshots({ request, response, auth }: HttpContext) {
      const employee = auth?.user!
      const { page, limit } = await request.validateUsing(employeeSearchValidator)

      // Optional date filter
      const dateString = request.input('date')
      let date: DateTime | null = null

      if (dateString) {
         date = DateTime.fromISO(dateString)
         if (!date.isValid) {
            return response.badRequest({
               error: 'Invalid date format. Use YYYY-MM-DD',
            })
         }
      }

      const query = Screenshot.query().where('user_id', employee.id).orderBy('captured_at', 'desc')

      // Filter by date if provided
      if (date) {
         const startOfDay = date.startOf('day')
         const endOfDay = date.endOf('day')
         query.whereBetween('captured_at', [startOfDay.toSQL()!, endOfDay.toSQL()!])
      }

      const screenshots = await query.paginate(page ?? 1, limit)

      return response.ok({
         data: screenshots.all().map((s) => ({
            id: s.id,
            filePath: s.filePath,
            fileUrl: s.getFileUrl(),
            capturedAt: s.capturedAt.toISO(),
            uploadedAt: s.uploadedAt.toISO(),
            hour: s.hour,
            minuteBucket: s.minuteBucket,
         })),
         meta: screenshots.getMeta(),
      })
   }

   /**
    * Get screenshots for a specific employee (Admin only)
    * GET /api/admin/employees/:employeeId/screenshots
    */
   async getEmployeeScreenshots({ params, request, response, auth }: HttpContext) {
      const admin = auth?.user!
      const employeeId = params.employeeId
      const { page, limit } = await request.validateUsing(employeeSearchValidator)
      const dateString = request.input('date')

      // Verify employee belongs to admin's company
      const employee = await db
         .from('users')
         .where('id', employeeId)
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .first()

      if (!employee) {
         return response.notFound({
            error: 'Employee not found',
         })
      }

      const query = Screenshot.query().where('user_id', employeeId).orderBy('captured_at', 'desc')

      // Filter by date if provided
      if (dateString) {
         const date = DateTime.fromISO(dateString)
         if (!date.isValid) {
            return response.badRequest({
               error: 'Invalid date format. Use YYYY-MM-DD',
            })
         }

         const startOfDay = date.startOf('day')
         const endOfDay = date.endOf('day')
         query.whereBetween('captured_at', [startOfDay.toSQL(), endOfDay.toSQL()])
      }

      const screenshots = await query.paginate(page ?? 1, limit)

      return response.ok({
         employee: {
            id: employee.id,
            name: employee.name,
         },
         data: screenshots.all().map((s) => ({
            id: s.id,
            filePath: s.filePath,
            fileUrl: s.getFileUrl(),
            capturedAt: s.capturedAt.toISO(),
            uploadedAt: s.uploadedAt.toISO(),
            hour: s.hour,
            minuteBucket: s.minuteBucket,
         })),
         meta: screenshots.getMeta(),
      })
   }

   /**
    * Get grouped screenshots for an employee (Admin only)
    * GET /api/admin/employees/:employeeId/screenshots/grouped
    */
   async getGroupedScreenshots({ params, request, response, auth }: HttpContext) {
      const admin = auth?.user!
      const employeeId = params.employeeId
      const dateString = request.input('date')

      if (!dateString) {
         return response.badRequest({
            error: 'Date parameter is required (format: YYYY-MM-DD)',
         })
      }

      const date = DateTime.fromISO(dateString)
      if (!date.isValid) {
         return response.badRequest({
            error: 'Invalid date format. Use YYYY-MM-DD',
         })
      }

      // Verify employee belongs to admin's company
      const employee = await db
         .from('users')
         .where('id', employeeId)
         .where('company_id', admin.companyId)
         .where('role', 'employee')
         .first()

      if (!employee) {
         return response.notFound({
            error: 'Employee not found',
         })
      }

      // Get grouped screenshots
      const grouped = await Screenshot.getGroupedScreenshots(employeeId, date)

      // Transform to array format for easier frontend consumption
      const groupedArray: any[] = []

      for (const [hour, buckets] of Object.entries(grouped)) {
         for (const [bucket, screenshots] of Object.entries(buckets!)) {
            groupedArray.push({
               hour: Number.parseInt(hour),
               minuteBucket: Number.parseInt(bucket),
               timeRange: `${hour.toString().padStart(2, '0')}:${bucket.toString().padStart(2, '0')} - ${hour.toString().padStart(2, '0')}:${(Number.parseInt(bucket) + (employee.screenshot_interval || 10)).toString().padStart(2, '0')}`,
               count: screenshots.length,
               screenshots: screenshots.map((s: any) => ({
                  id: s.id,
                  filePath: s.filePath,
                  fileUrl: s.getFileUrl(),
                  capturedAt: s.capturedAt.toISO(),
               })),
            })
         }
      }

      // Sort by hour and bucket
      groupedArray.sort((a, b) => {
         if (a.hour !== b.hour) return a.hour - b.hour
         return a.minuteBucket - b.minuteBucket
      })

      return response.ok({
         employee: {
            id: employee.id,
            name: employee.name,
            screenshotInterval: employee.screenshot_interval,
         },
         date: date.toISODate(),
         totalScreenshots: groupedArray.reduce((sum, g) => sum + g.count, 0),
         groups: groupedArray,
      })
   }
}
