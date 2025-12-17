import vine from '@vinejs/vine'

export const kycValidator = vine.compile(
  vine.object({
    type: vine.enum(['bvn', 'nin']),
    bvn: vine
      .string()
      .regex(/^\d{11}$/)
      .optional()
      .requiredWhen('type', '=', 'bvn'),
    nin: vine
      .string()
      .regex(/^\d{11}$/)
      .optional()
      .requiredWhen('type', '=', 'nin'),
  })
)
