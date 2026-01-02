import type { HttpContext } from '@adonisjs/core/http'
import Plan from '#models/plan'

export default class PlansController {
   /**
    * Get all available plans (PUBLIC - no auth required)
    * GET /api/plans
    */
   async index({ response }: HttpContext) {
      try {
         const plans = await Plan.query().orderBy('pricePerEmployee', 'asc')

         return response.ok({
            data: plans.map((plan) => ({
               id: plan.id,
               name: plan.name,
               pricePerEmployee: plan.pricePerEmployee,
            })),
         })
      } catch (error) {
         return response.internalServerError({
            error: `Failed to fetch plans, ${error}`,
         })
      }
   }
}
