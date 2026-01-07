import Company from '#models/company'
import Plan from '#models/plan'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { faker } from '@faker-js/faker'

export default class CompanySeeder extends BaseSeeder {
   public static environment = ['development', 'testing']

   public async run() {
      // Get all plans from database
      const plans = await Plan.all()
      if (!plans.length) {
         console.error('No plans found in the database!')
         return
      }

      const planIds = plans.map((p) => p.id)

      // Insert 200 companies
      const companies = Array.from({ length: 200 }).map(() => {
         return {
            name: faker.company.name(),
            planId: faker.helpers.arrayElement(planIds),
         }
      })

      await Company.createMany(companies)
      console.log('200 companies created successfully!')
   }
}
