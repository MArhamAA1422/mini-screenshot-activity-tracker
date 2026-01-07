import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Screenshot from '#models/screenshot'
import User from '#models/user'
import { DateTime } from 'luxon'
import { faker } from '@faker-js/faker'

export default class ScreenshotSeeder extends BaseSeeder {
   public static environment = ['development', 'testing']

   async run() {
      const users = await User.all()
      if (!users.length) {
         console.error('No users found! Seed users first.')
         return
      }

      console.log(`Creating screenshots for ${users.length} users...`)

      // Reusable screenshot file paths
      const filePaths = [
         '2/6/2025-12-31/screenshot_1767163246_jssj3v8v9ny23vomk1fr713u.png',
         '2/6/2025-12-30/screenshot_1767108600_q3etxml1smy6xdup4lsm2pbz.png',
         '2/6/2026-01-01/screenshot_1767248290_arah5oriiqgtaqsbcowiuoox.png',
         '2/6/2026-01-01/screenshot_1767252408_xricb5xbf3j575mdrp3mnsg8.png',
         '2/6/2026-01-01/screenshot_1767258343_o7it3zmz4v2sn6456xdvrm3t.png',
         '2/6/2025-12-30/screenshot_1767100500_h5dg7hsmr05bnyt4w3ht3qmo.png',
         '2/6/2026-01-05/screenshot_1767606921_s6td3xogqeqc6qsysumk1fcy.png',
         '2/6/2026-01-05/screenshot_1767609661_wf1c2ruaw2mdnopbq7in4o94.png',
         '2/6/2026-01-05/screenshot_1767609792_btylrqlm34i3mn6tapuyumnk.png',
         '2/6/2026-01-05/screenshot_1767609842_ceen64waoohrbzgqphixzhml.png',
         '2/6/2026-01-05/screenshot_1767610511_bbpxbhmd0t56uftxw0qffjw0.png',
         '2/6/2026-01-06/screenshot_1767677918_l1lo1zq14ywk49qucsl01yma.png',
      ]

      const screenshotsToInsert: any[] = []
      const today = DateTime.now()

      for (const user of users) {
         for (let i = 0; i < 50; i++) {
            // Pick a random number of days back (0–6 days)
            const daysAgo = faker.number.int({ min: 0, max: 6 })

            // Random hour/min/sec
            const randomTime = today.minus({ days: daysAgo }).set({
               hour: faker.number.int({ min: 8, max: 20 }), // working hours-ish
               minute: faker.number.int({ min: 0, max: 59 }),
               second: faker.number.int({ min: 0, max: 59 }),
            })

            const filePath = faker.helpers.arrayElement(filePaths)

            screenshotsToInsert.push({
               userId: user.id,
               companyId: user.companyId,
               filePath,
               capturedAt: randomTime,
               uploadedAt: randomTime, // or randomTime.plus({ seconds: 5 }) if you want
               createdAt: DateTime.now(),
            })
         }

         // Insert in batches of 1,000 to avoid DB choke
         if (screenshotsToInsert.length >= 1000) {
            await Screenshot.createMany(screenshotsToInsert.splice(0, 1000))
            console.log('Batch inserted 1000 screenshots...')
         }
         console.log('Done', user.name)
      }

      // Insert leftovers
      if (screenshotsToInsert.length > 0) {
         await Screenshot.createMany(screenshotsToInsert)
      }

      console.log('All screenshots created successfully!')
   }
}
