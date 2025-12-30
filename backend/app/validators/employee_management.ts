import vine from '@vinejs/vine'

/**
 * Validator for creating employee
 */
export const createEmployeeValidator = vine.compile(
   vine.object({
      name: vine.string().trim().minLength(2).maxLength(255),
      email: vine.string().trim().email().normalizeEmail(),
      password: vine.string().minLength(4).maxLength(255),
      screenshotInterval: vine.number().positive().in([5, 10]).optional(),
   })
)

/**
 * Validator for employee search/filter
 */
export const employeeSearchValidator = vine.compile(
   vine.object({
      search: vine.string().trim().minLength(1).optional(),
      page: vine.number().positive().optional(),
      limit: vine.number().positive().withoutDecimals().range([1, 100]).optional(),
   })
)
