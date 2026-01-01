import type { HttpContext } from '@adonisjs/core/http'
import Screenshot from '#models/screenshot'
import ScreenshotService from '#services/screenshot_service'
import { getScreenshotsValidator } from '#validators/screenshot'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class ScreenshotsController {
   /**
    * Upload screenshot (Employee only)
    * POST /api/employee/screenshots
    */
   async upload({ request, response, auth }: HttpContext) {
      const employee = auth?.user!

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
         console.error('Upload error:', error)
         return response.internalServerError({
            error: 'Failed to upload screenshot',
            details: error.message,
         })
      }
   }

   /**
    * Bulk upload screenshots (Employee only)
    * POST /api/employee/screenshots/bulk
    */
   async bulkUpload({ request, response, auth }: HttpContext) {
      const employee = auth?.user!

      const screenshots = request.files('screenshots', {
         size: '5mb',
         extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })

      if (!screenshots || screenshots.length === 0) {
         return response.badRequest({
            error: 'At least one screenshot is required',
         })
      }

      if (screenshots.length > 50) {
         return response.badRequest({
            error: 'Maximum 50 screenshots allowed per bulk upload',
         })
      }

      const capturedTimesInput = request.input('capturedTimes', [])
      const capturedTimes: (DateTime | undefined)[] = capturedTimesInput.map((time: string) => {
         const parsed = DateTime.fromISO(time)
         return parsed.isValid ? parsed : undefined
      })

      const results = {
         uploaded: [] as any[],
         failed: [] as any[],
      }

      const trx = await db.transaction()

      try {
         for (const [i, screenshot] of screenshots.entries()) {
            const capturedAt = capturedTimes[i]

            try {
               const metadata = await ScreenshotService.uploadScreenshot(
                  screenshot,
                  employee.companyId,
                  employee.id,
                  capturedAt
               )

               const screenshotRecord = await Screenshot.create(
                  {
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
                  },
                  { client: trx }
               )

               results.uploaded.push({
                  id: screenshotRecord.id,
                  fileName: screenshot.clientName,
                  capturedAt: screenshotRecord.capturedAt.toISO(),
               })
            } catch (error) {
               results.failed.push({
                  fileName: screenshot.clientName,
                  error: error.message,
               })
            }
         }

         await trx.commit()

         return response.created({
            message: `${results.uploaded.length} screenshots uploaded, ${results.failed.length} failed`,
            data: results,
         })
      } catch (error) {
         await trx.rollback()
         throw error
      }
   }

   /**
    * Get employee's own screenshots
    * GET /api/employee/screenshots
    */
   async myScreenshots({ request, response, auth }: HttpContext) {
      const employee = auth?.user!
      const validated = await request.validateUsing(getScreenshotsValidator)

      const page = validated.page || 1
      const limit = validated.limit || 50
      const date = validated.date

      const query = Screenshot.query().where('user_id', employee.id).orderBy('captured_at', 'desc')

      if (date) {
         const startOfDay = date.startOf('day')
         const endOfDay = date.endOf('day')
         query.whereBetween('captured_at', [startOfDay.toSQL()!, endOfDay.toSQL()!])
      }

      const screenshots = await query.paginate(page, limit)

      return response.ok({
         data: screenshots.all().map((s) => ({
            id: s.id,
            filePath: s.filePath,
            fileUrl: s.getFileUrl(employee.role),
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
      const validated = await request.validateUsing(getScreenshotsValidator)

      const page = validated.page || 1
      const limit = validated.limit || 100
      const date = validated.date

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

      if (date) {
         const startOfDay = date.startOf('day')
         const endOfDay = date.endOf('day')
         query.whereBetween('captured_at', [startOfDay.toSQL()!, endOfDay.toSQL()!])
      }

      const screenshots = await query.paginate(page, limit)

      return response.ok({
         employee: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
         },
         data: screenshots.all().map((s) => ({
            id: s.id,
            filePath: s.filePath,
            fileUrl: s.getFileUrl('admin'),
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

      const grouped = await Screenshot.getGroupedScreenshots(employeeId, date)

      const groupedArray: any[] = []

      for (const [hour, buckets] of Object.entries(grouped)) {
         for (const [bucket, screenshots] of Object.entries(buckets)) {
            groupedArray.push({
               hour: Number.parseInt(hour),
               minuteBucket: Number.parseInt(bucket),
               timeRange: `${hour.toString().padStart(2, '0')}:${bucket.toString().padStart(2, '0')} - ${hour.toString().padStart(2, '0')}:${(Number.parseInt(bucket) + (employee.screenshot_interval || 10)).toString().padStart(2, '0')}`,
               count: screenshots.length,
               screenshots: screenshots.map((s) => ({
                  id: s.id,
                  filePath: s.filePath,
                  fileUrl: s.getFileUrl('admin'),
                  capturedAt: s.capturedAt.toISO(),
               })),
            })
         }
      }

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

   /**
    * Get screenshot statistics (Admin only)
    * GET /api/admin/screenshots/stats
    */
   // async stats({ request, response, auth }: HttpContext) {
   //    const admin = auth?.user!
   //    const startDateString = request.input('startDate')
   //    const endDateString = request.input('endDate')

   //    let startDate = DateTime.now().minus({ days: 30 })
   //    let endDate = DateTime.now()

   //    if (startDateString) {
   //       startDate = DateTime.fromISO(startDateString)
   //       if (!startDate.isValid) {
   //          return response.badRequest({ error: 'Invalid startDate' })
   //       }
   //    }

   //    if (endDateString) {
   //       endDate = DateTime.fromISO(endDateString)
   //       if (!endDate.isValid) {
   //          return response.badRequest({ error: 'Invalid endDate' })
   //       }
   //    }

   //    const stats = await Screenshot.getCompanyStats(admin.companyId, startDate, endDate)

   //    return response.ok({
   //       dateRange: {
   //          start: startDate.toISODate(),
   //          end: endDate.toISODate(),
   //       },
   //       stats,
   //    })
   // }

   /**
    * Serve screenshot file (authenticated)
    * GET /api/admin/screenshots/file/* or /api/employee/screenshots/file/*
    */
   async serveScreenshotFile({ request, response, auth }: HttpContext) {
      const user = auth?.user!

      try {
         const pathSegments = request.param('*')
         const filePath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments

         if (filePath.includes('..') || filePath.startsWith('/')) {
            return response.status(403).send({
               error: 'Forbidden: Invalid file path',
            })
         }

         // Parse the file path to extract company_id and user_id
         // Format: {company_id}/{user_id}/{date}/filename.png
         const pathParts = filePath.split('/')
         if (pathParts.length < 3) {
            return response.status(400).send({
               error: 'Invalid file path format',
            })
         }

         const fileCompanyId = Number.parseInt(pathParts[0])
         const fileUserId = Number.parseInt(pathParts[1])

         if (Number.isNaN(fileCompanyId) || Number.isNaN(fileUserId)) {
            return response.status(400).send({
               error: 'Invalid file path format',
            })
         }

         if (user.isAdmin()) {
            if (fileCompanyId !== user.companyId) {
               return response.status(403).send({
                  error: 'You do not have permission to access this screenshot',
               })
            }
         } else if (user.isEmployee()) {
            if (fileUserId !== user.id || fileCompanyId !== user.companyId) {
               return response.status(403).send({
                  error: 'You do not have permission to access this screenshot',
               })
            }
         }

         const fullPath = ScreenshotService.getFullPath(filePath)

         const exists = await ScreenshotService.fileExists(filePath)
         if (!exists) {
            return response.status(404).send({
               error: 'Screenshot not found',
            })
         }

         return response.download(fullPath, false)
      } catch (error) {
         console.error('Error serving screenshot:', error)
         return response.status(500).send({
            error: 'Error serving screenshot',
         })
      }
   }
}
