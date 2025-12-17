import vine from '@vinejs/vine'

export const signupValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().email().normalizeEmail(),
    phone: vine
      .string()
      .trim()
      .regex(/^0[789][01]\d{8}$/),
    password: vine.string().minLength(8).maxLength(32),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string(),
  })
)
