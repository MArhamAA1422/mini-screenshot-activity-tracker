import type { HttpContext } from '@adonisjs/core/http'
import Screenshot from '#models/screenshot'
import ScreenshotService from '#services/screenshot_service'
import { getScreenshotsValidator } from '#validators/screenshot'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { readFile } from 'node:fs/promises'

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
         })

         return response.created({
            message: 'Screenshot uploaded successfully',
            data: {
               id: screenshotRecord.id,
               filePath: screenshotRecord.filePath,
               fileUrl: screenshotRecord.getFileUrl(),
               capturedAt: screenshotRecord.capturedAt.toISO(),
               uploadedAt: screenshotRecord.uploadedAt.toISO(),
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
    * Get grouped screenshots for an employee (Admin only)
    * GET /api/admin/employees/:employeeId/screenshots/grouped
    */
   async getGroupedScreenshots({ params, request, response, auth }: HttpContext) {
      try {
         const admin = auth?.user!
         const employeeId = params.employeeId
         const dateString = request.input('date')
         const includeImages = request.input('includeImages', 'false') === 'true'

         if (!dateString) {
            return response.badRequest({
               error: 'Date parameter is required (format: YYYY-MM-DD)',
            })
         }

         const date = DateTime.fromISO(dateString, { zone: 'Asia/Dhaka' })
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
               const screenshotData = await Promise.all(
                  screenshots.map(async (s: any) => {
                     const data: any = {
                        id: s.id,
                        filePath: s.filePath,
                        fileUrl: s.getFileUrl('admin'),
                        capturedAt: s.capturedAt.toISO(),
                     }

                     // Include base64 image data if requested
                     if (includeImages) {
                        try {
                           const fullPath = ScreenshotService.getFullPath(s.filePath)
                           const imageBuffer = await readFile(fullPath)
                           const base64 = imageBuffer.toString('base64')
                           const mimeType = s.filePath.endsWith('.png')
                              ? 'image/png'
                              : s.filePath.endsWith('.jpg') || s.filePath.endsWith('.jpeg')
                                ? 'image/jpeg'
                                : 'image/webp'

                           data.imageData = `data:${mimeType};base64,${base64}`
                        } catch (error) {
                           console.error(`Failed to load image ${s.id}:`, error)
                           data.imageData = null
                        }
                     }

                     return data
                  })
               )

               const bucketStart = DateTime.fromObject({
                  year: date.year,
                  month: date.month,
                  day: date.day,
                  hour: Number(hour),
                  minute: Number(bucket),
               })

               const interval = employee.screenshot_interval || 10
               const bucketEnd = bucketStart.plus({ minutes: interval })

               groupedArray.push({
                  hour: bucketStart.hour,
                  minuteBucket: bucketStart.minute,
                  timeRange: `${bucketStart.toFormat('HH:mm')} - ${bucketEnd.toFormat('HH:mm')}`,
                  count: screenshots.length,
                  screenshots: screenshotData,
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
            imagesEmbedded: includeImages, // Indicates if images are included
         })
      } catch (error) {
         return response.internalServerError({
            error: 'Error in getting screenshots',
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
      try {
         const employee = auth?.user!
         const { page = 1, limit = 50, date } = await request.validateUsing(getScreenshotsValidator)

         const query = Screenshot.query()
            .where('user_id', employee.id)
            .orderBy('captured_at', 'desc')

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
            })),
            meta: screenshots.getMeta(),
         })
      } catch (error) {
         return response.internalServerError({
            error: 'Error in getting your screenshots',
            detailsError: error,
         })
      }
   }
}
