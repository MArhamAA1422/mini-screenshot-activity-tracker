import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
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

   @column.dateTime({ autoCreate: true })
   declare createdAt: DateTime

   @belongsTo(() => User)
   declare user: BelongsTo<typeof User>

   @belongsTo(() => Company)
   declare company: BelongsTo<typeof Company>

   static calculateMinuteBucket(minute: number, intervalMinutes: number = 10): number {
      return Math.floor(minute / intervalMinutes) * intervalMinutes
   }

   /**
    * Get authenticated file URL based on user role
    * @param role - 'admin' or 'employee'
    */
   getFileUrl(role: 'admin' | 'employee' = 'admin'): string {
      return `/api/${role}/screenshots/file/${this.filePath}`
   }

   getFullFilePath(): string {
      return `storage/screenshots/${this.filePath}`
   }

   getDate(): string {
      return this.capturedAt.toISODate() || ''
   }

   getTime(): string {
      return this.capturedAt.toFormat('HH:mm:ss')
   }

   getGroupKey(): string {
      return `${this.getDate()}_${this.capturedAt.hour}_${Screenshot.calculateMinuteBucket(this.capturedAt.minute)}`
   }

   static async getGroupedScreenshots(userId: number, date: DateTime) {
      const startOfDay = date.startOf('day')
      const endOfDay = date.endOf('day')

      const screenshots = await Screenshot.query()
         .where('user_id', userId)
         .whereBetween('captured_at', [startOfDay.toSQL()!, endOfDay.toSQL()!])
         .orderBy('captured_at', 'asc')

      const grouped: Record<number, Record<number, Screenshot[]>> = {}

      screenshots.forEach((screenshot) => {
         const hour = screenshot.capturedAt.hour
         const bucket = this.calculateMinuteBucket(screenshot.capturedAt.minute)

         if (!grouped[hour]) {
            grouped[hour] = {}
         }

         if (!grouped[hour][bucket]) {
            grouped[hour][bucket] = []
         }

         grouped[hour][bucket].push(screenshot)
      })

      return grouped
   }

   static async searchByEmployeeName(
      companyId: number,
      searchTerm: string,
      date?: DateTime
   ): Promise<Screenshot[]> {
      const query = Screenshot.query()
         .whereHas('user', (userQuery) => {
            userQuery.where('company_id', companyId).where('name', 'like', `%${searchTerm}%`)
         })
         .preload('user')
         .orderBy('captured_at', 'desc')

      if (date) {
         const startOfDay = date.startOf('day')
         const endOfDay = date.endOf('day')
         query.whereBetween('captured_at', [startOfDay.toSQL()!, endOfDay.toSQL()!])
      }

      return query
   }

   serializeExtras() {
      return {
         file_url: this.getFileUrl('admin'),
         date: this.getDate(),
         time: this.getTime(),
         group_key: this.getGroupKey(),
      }
   }

   toJSON() {
      return {
         ...super.toJSON(),
         file_url: this.getFileUrl('admin'),
      }
   }
}
