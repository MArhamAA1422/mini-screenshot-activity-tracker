import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * Validator for screenshot upload
 */
export const uploadScreenshotValidator = vine.compile(
   vine.object({
      screenshot: vine
         .file({
            size: '5mb',
            extnames: ['jpg', 'jpeg', 'png', 'webp'],
         })
         .optional(),

      capturedAt: vine
         .string()
         .transform((value) => {
            const parsed = DateTime.fromISO(value)
            if (!parsed.isValid) {
               throw new Error(
                  'Invalid datetime format. Use ISO 8601 format (e.g., 2025-12-30T15:30:00)'
               )
            }
            return parsed
         })
         .optional(),
   })
)

/**
 * Validator for bulk screenshot upload
 */
export const bulkUploadScreenshotValidator = vine.compile(
   vine.object({
      screenshots: vine
         .array(
            vine.file({
               size: '5mb',
               extnames: ['jpg', 'jpeg', 'png', 'webp'],
            })
         )
         .minLength(1)
         .maxLength(50),

      capturedTimes: vine.array(vine.string()).optional(),
   })
)

/**
 * Validator for getting screenshots (filters)
 */
export const getScreenshotsValidator = vine.compile(
   vine.object({
      date: vine
         .string()
         .transform((value) => {
            const parsed = DateTime.fromISO(value)
            if (!parsed.isValid) {
               throw new Error('Invalid date format. Use YYYY-MM-DD')
            }
            return parsed
         })
         .optional(),

      startDate: vine
         .string()
         .transform((value) => {
            const parsed = DateTime.fromISO(value)
            if (!parsed.isValid) {
               throw new Error('Invalid start date format')
            }
            return parsed
         })
         .optional(),

      endDate: vine
         .string()
         .transform((value) => {
            const parsed = DateTime.fromISO(value)
            if (!parsed.isValid) {
               throw new Error('Invalid end date format')
            }
            return parsed
         })
         .optional(),

      page: vine.number().positive().optional(),
      limit: vine.number().positive().withoutDecimals().range([1, 100]).optional(),
   })
)

/**
 * Validator for deleting screenshot
 */
export const deleteScreenshotValidator = vine.compile(
   vine.object({
      id: vine.number().positive(),
   })
)

/**
 * Validator for grouped screenshots query
 */
export const groupedScreenshotsValidator = vine.compile(
   vine.object({
      date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
   })
)
