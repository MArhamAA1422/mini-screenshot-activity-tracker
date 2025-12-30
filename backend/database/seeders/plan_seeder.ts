import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Plan from '#models/plan'

export default class extends BaseSeeder {
  async run() {
    await Plan.createMany([
      {
        name: 'Basic',
        pricePerEmployee: 2.0,
      },
      {
        name: 'Pro',
        pricePerEmployee: 5.0,
      },
      {
        name: 'Enterprise',
        pricePerEmployee: 10.0,
      },
    ])

    console.log('Plans seeded successfully')
  }
}
