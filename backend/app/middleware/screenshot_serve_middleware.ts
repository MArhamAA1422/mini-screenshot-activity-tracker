import { HttpContext } from '@adonisjs/core/http'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'

type ImageExtension = 'png' | 'jpg' | 'jpeg' | 'webp'

const contentTypeMap: Record<ImageExtension, string> = {
   png: 'image/png',
   jpg: 'image/jpeg',
   jpeg: 'image/jpeg',
   webp: 'image/webp',
}

/**
 * Middleware to serve screenshot files
 */
export default async function screenshotServeMiddleware(ctx: HttpContext) {
   const { params } = ctx

   // Get the file path from URL params
   // URL: /screenshots/2/6/2025-12-31/screenshot_xxx.png
   // Params: companyId/userId/date/filename
   const filePath = `${params.companyId}/${params.userId}/${params.date}/${params.filename}`

   try {
      const fullPath = join(app.makePath('storage/screenshots'), filePath)

      const fileStats = await stat(fullPath)
      if (!fileStats.isFile()) {
         return ctx.response.notFound('Screenshot not found')
      }

      const fileBuffer = await readFile(fullPath)

      const extension = params.filename.split('.').pop()?.toLowerCase()
      const contentType =
         contentTypeMap[
            (['png', 'jpg', 'jpeg', 'webp'].includes(extension)
               ? extension
               : 'png') as ImageExtension
         ]

      ctx.response.header('Content-Type', contentType)
      ctx.response.header('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
      return ctx.response.send(fileBuffer)
   } catch (error) {
      return ctx.response.notFound('Screenshot not found')
   }
}
