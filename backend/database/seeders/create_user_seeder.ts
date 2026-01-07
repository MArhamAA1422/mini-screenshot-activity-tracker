import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Company from '#models/company'
import User from '#models/user'
import { faker } from '@faker-js/faker'
import hash from '@adonisjs/core/services/hash'

type Role = 'admin' | 'employee'

export default class UserSeeder extends BaseSeeder {
   public static environment = ['development', 'testing']

   public async run() {
      const companies = await Company.all()
      if (!companies.length) {
         console.error('No companies found! Seed companies first.')
         return
      }

      console.log(`Creating users for ${companies.length} companies...`)

      const password = await hash.make('0110')

      for (const company of companies) {
         const safeCompany = company.name.toLowerCase().replace(/[^a-z0-9]/g, '')

         // Create admin email like: company-admin@go.com
         let role: Role = 'admin'
         await User.create({
            name: faker.person.fullName(),
            email: `${safeCompany}-admin@go.com`.toLowerCase(),
            password,
            role,
            companyId: company.id,
         })

         // Create 49 employees with deterministic unique emails
         role = 'employee'
         const employees = []
         for (let i = 1; i <= 49; i++) {
            employees.push({
               name: faker.person.fullName(),
               email: `${safeCompany}-emp-${i}@go.com`.toLowerCase(),
               password,
               role,
               companyId: company.id,
            })
         }

         await User.createMany(employees)
         console.log('Done', company.name)
      }

      console.log('All users created successfully!')
   }
}
