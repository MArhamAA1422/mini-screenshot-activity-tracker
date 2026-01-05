import { MultipartFile } from '@adonisjs/core/bodyparser'
import { DateTime } from 'luxon'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'

interface ScreenshotMetadata {
   fileName: string
   filePath: string
   fileSize: number
   mimeType: string
   capturedAt: DateTime
}

export default class ScreenshotService {
   /**
    * Base storage path for screenshots
    */
   private static getStoragePath(): string {
      return app.makePath('storage/screenshots')
   }

   /**
    * Generate file path structure: company_id/user_id/YYYY-MM-DD/
    */
   private static generateFilePath(companyId: number, userId: number, date: DateTime): string {
      const dateStr = date.toFormat('yyyy-MM-dd')
      return `${companyId}/${userId}/${dateStr}`
   }

   /**
    * Generate unique filename
    */
   private static generateFileName(originalName: string, capturedAt: DateTime): string {
      const timestamp = capturedAt.toUnixInteger()
      const extension = originalName.split('.').pop()
      const uniqueId = cuid()
      return `screenshot_${timestamp}_${uniqueId}.${extension}`
   }

   /**
    * Extract datetime from filename if possible
    * Format: screenshot_TIMESTAMP_*.ext
    */
   static extractDateTimeFromFilename(filename: string): DateTime | null {
      try {
         const match = filename.match(/screenshot_(\d{10})/)
         if (match) {
            const timestamp = Number.parseInt(match[1])
            return DateTime.fromSeconds(timestamp)
         }
         return null
      } catch {
         return null
      }
   }

   /**
    * Upload single screenshot
    */
   static async uploadScreenshot(
      file: MultipartFile,
      companyId: number,
      userId: number,
      capturedAt?: DateTime | null
   ): Promise<ScreenshotMetadata> {
      // Use provided capturedAt or try to extract from filename or use current time
      let captureTime = capturedAt

      if (!captureTime) {
         captureTime = this.extractDateTimeFromFilename(file.clientName)
      }

      if (!captureTime || !captureTime.isValid) {
         captureTime = DateTime.now().setZone('Asia/Dhaka')
      }

      const relativePath = this.generateFilePath(companyId, userId, captureTime)
      const fileName = this.generateFileName(file.clientName, captureTime)
      const fullPath = join(this.getStoragePath(), relativePath)

      await mkdir(fullPath, { recursive: true })

      const filePath = join(fullPath, fileName)

      await file.move(fullPath, {
         name: fileName,
         overwrite: false,
      })

      if (file.hasErrors) {
         throw new Error(`File upload failed: ${JSON.stringify(file.errors)}`)
      }

      const stats = await stat(filePath)

      return {
         fileName,
         filePath: `${relativePath}/${fileName}`, // Relative path for database
         fileSize: stats.size,
         mimeType: file.type || 'image/png',
         capturedAt: captureTime,
      }
   }

   /**
    * Get full file system path
    */
   static getFullPath(filePath: string): string {
      return join(this.getStoragePath(), filePath)
   }

   /**
    * Check if file exists
    */
   static async fileExists(filePath: string): Promise<boolean> {
      try {
         const fullPath = join(this.getStoragePath(), filePath)
         await stat(fullPath)
         return true
      } catch {
         return false
      }
   }
}
