import vine from '@vinejs/vine'

export const staffValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email(),
    phone: vine.string().trim().optional(),
    password: vine.string().minLength(8),
    role: vine.enum(['admin', 'staff']),
    serviceIds: vine.array(vine.number()).optional(),
  })
)

export const staffUpdateValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().email(),
    phone: vine.string().trim().optional(),
    password: vine.string().minLength(8).optional(),
    role: vine.enum(['admin', 'staff']),
    serviceIds: vine.array(vine.number()).optional(),
  })
)

export const staffAvailabilityValidator = vine.compile(
  vine.object({
    availabilities: vine.array(
      vine.object({
        dayOfWeek: vine.number().min(0).max(6),
        isActive: vine.boolean(),
        startTime: vine.string().optional(),
        endTime: vine.string().optional(),
      })
    ),
  })
)

