import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

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
            // Try to parse as ISO datetime
            const parsed = DateTime.fromISO(value)
            if (!parsed.isValid) {
               throw new Error(
                  'Invalid datetime format. Use ISO 8601 format (e.g., 2025-12-30T15:30:00)'
               )
            }
            return parsed
         })
         .optional(), // Optional, will use current time if not provided
   })
)

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
      limit: vine.number().positive().withoutDecimals().range([1, 30]).optional(),
   })
)
