import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Company from './company.js'

export default class Screenshot extends BaseModel {
   @column({ isPrimary: true })
   declare id: number

   @column()
   declare companyId: number

   @column()
   declare userId: number

   @column()
   declare filePath: string

   @column.dateTime()
   declare capturedAt: DateTime

   @column.dateTime()
   declare uploadedAt: DateTime

   @column()
   declare hour: number // 0-23

   @column()
   declare minuteBucket: number

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @belongsTo(() => User)
   declare user: BelongsTo<typeof User>

   @belongsTo(() => Company)
   declare company: BelongsTo<typeof Company>

   // Hooks
   @beforeCreate()
   static async calculateTimeFields(screenshot: Screenshot) {
      if (screenshot.capturedAt && !screenshot.hour && screenshot.hour !== 0) {
         screenshot.hour = screenshot.capturedAt.hour
      }

      if (screenshot.capturedAt && !screenshot.minuteBucket && screenshot.minuteBucket !== 0) {
         screenshot.minuteBucket = Screenshot.calculateMinuteBucket(screenshot.capturedAt.minute)
      }

      if (!screenshot.uploadedAt) {
         screenshot.uploadedAt = DateTime.now()
      }
   }

   // Helper methods
   static calculateMinuteBucket(minute: number, intervalMinutes: number = 5): number {
      return Math.floor(minute / intervalMinutes) * intervalMinutes
   }

   getFileUrl(): string {
      // For local filesystem
      return `/screenshots/${this.filePath}`
   }

   getFullFilePath(): string {
      // Assuming screenshots are stored in storage/screenshots
      return `storage/screenshots/${this.filePath}`
   }

   getDate(): string {
      return this.capturedAt.toISODate() || ''
   }

   getTime(): string {
      return this.capturedAt.toFormat('HH:mm:ss')
   }

   getGroupKey(): string {
      return `${this.getDate()}_${this.hour}_${this.minuteBucket}`
   }

   // Static query helpers
   // static async getGroupedScreenshots(userId: number, date: DateTime, intervalMinutes: number = 5) {
   //    const startOfDay = date.startOf('day')
   //    const endOfDay = date.endOf('day')

   //    const screenshots = await Screenshot.query()
   //       .where('user_id', userId)
   //       .whereBetween('captured_at', [startOfDay.toSQL(), endOfDay.toSQL()])
   //       .orderBy('captured_at', 'asc')

   //    // Group by hour and minute bucket
   //    const grouped: Record<number, Record<number, Screenshot[]>> = {}

   //    screenshots.forEach((screenshot) => {
   //       const hour = screenshot.hour
   //       const bucket = screenshot.minuteBucket

   //       if (!grouped[hour]) {
   //          grouped[hour] = {}
   //       }

   //       if (!grouped[hour][bucket]) {
   //          grouped[hour][bucket] = []
   //       }

   //       grouped[hour][bucket].push(screenshot)
   //    })

   //    return grouped
   // }

   static async getDateRange(userId: number): Promise<{ min: DateTime; max: DateTime } | null> {
      const result = await Screenshot.query()
         .where('user_id', userId)
         .select('captured_at')
         .orderBy('captured_at', 'asc')
         .first()

      const resultMax = await Screenshot.query()
         .where('user_id', userId)
         .select('captured_at')
         .orderBy('captured_at', 'desc')
         .first()

      if (!result || !resultMax) {
         return null
      }

      return {
         min: result.capturedAt,
         max: resultMax.capturedAt,
      }
   }

   // Search and filter helpers
   // static async searchByEmployeeName(
   //    companyId: number,
   //    searchTerm: string,
   //    date?: DateTime
   // ): Promise<Screenshot[]> {
   //    const query = Screenshot.query()
   //       .whereHas('user', (userQuery) => {
   //          userQuery.where('company_id', companyId).where('name', 'like', `%${searchTerm}%`)
   //       })
   //       .preload('user')
   //       .orderBy('captured_at', 'desc')

   //    if (date) {
   //       const startOfDay = date.startOf('day')
   //       const endOfDay = date.endOf('day')
   //       query.whereBetween('captured_at', [startOfDay.toSQL(), endOfDay.toSQL()])
   //    }

   //    return query
   // }

   // Serialization
   serializeExtras() {
      return {
         file_url: this.getFileUrl(),
         date: this.getDate(),
         time: this.getTime(),
         group_key: this.getGroupKey(),
      }
   }

   toJSON() {
      return {
         ...super.toJSON(),
         file_url: this.getFileUrl(),
      }
   }
}
