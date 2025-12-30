import vine, { SimpleMessagesProvider } from '@vinejs/vine'

const schema = vine.object({
   ownerName: vine.string().trim().minLength(2).maxLength(255),
   ownerEmail: vine.string().trim().email().normalizeEmail(),
   companyName: vine.string().trim().minLength(2).maxLength(255),
   planId: vine.number().in([1, 2, 3]),
   password: vine.string().minLength(4).maxLength(255),
})

const messagesProvider = new SimpleMessagesProvider({
   'ownerEmail.required': 'Email is required to create an account.',
   'ownerEmail.email': 'Please enter a valid email address.',

   'password.required': 'You must choose a password.',
   'password.minLength': 'Password must be at least 4 characters long.',
   'password.maxLength': 'Password cannot be longer than 255 characters.',

   'companyName.minLength': 'companyName must be at least 2 characters long.',
   'companyName.maxLength': 'companyName cannot be longer than 255 characters.',

   'ownerName.minLength': 'ownerName must be at least 2 characters long.',
   'ownerName.maxLength': 'ownerName cannot be longer than 255 characters.',
})

export const companySignupValidator = vine.compile(schema)
companySignupValidator.messagesProvider = messagesProvider
