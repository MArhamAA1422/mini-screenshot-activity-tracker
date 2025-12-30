import vine, { SimpleMessagesProvider } from '@vinejs/vine'

/**
 * Validator for company signup
 */
export const companySignupValidator = (vine.compile(
   vine.object({
      ownerName: vine.string().trim().minLength(2).maxLength(255),
      ownerEmail: vine.string().trim().email().normalizeEmail().maxLength(255),
      companyName: vine.string().trim().minLength(2).maxLength(255),
      password: vine.string().minLength(4).maxLength(255),
      planId: vine.number().positive().withoutDecimals(),
   })
).messagesProvider = new SimpleMessagesProvider({
   'ownerEmail.required': 'Email is required to create an account.',
   'ownerEmail.email': 'Please enter a valid email address.',

   'password.required': 'You must choose a password.',
   'password.minLength': 'Password must be at least 4 characters long.',
   'password.maxLength': 'Password cannot be longer than 255 characters.',

   'companyName.minLength': 'companyName must be at least 2 characters long.',
   'companyName.maxLength': 'companyName cannot be longer than 255 characters.',

   'ownerName.minLength': 'ownerName must be at least 2 characters long.',
   'ownerName.maxLength': 'ownerName cannot be longer than 255 characters.',
}))

/**
 * Validator for company login
 */
export const companyLoginValidator = vine.compile(
   vine.object({
      email: vine.string().trim().email().normalizeEmail(),
      password: vine.string().minLength(4).maxLength(255),
   })
)

/**
 * Validator for employee login
 */
export const employeeLoginValidator = vine.compile(
   vine.object({
      email: vine.string().trim().email().normalizeEmail(),
      password: vine.string().minLength(1).maxLength(255),
   })
)

/**
 * Validator for refresh token
 */
export const refreshTokenValidator = vine.compile(
   vine.object({
      refreshToken: vine.string().minLength(1).maxLength(255),
   })
)
