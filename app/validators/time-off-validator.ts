import vine from '@vinejs/vine'

export const timeOffValidator = vine.compile(
  vine.object({
    title: vine.string().trim().maxLength(100).optional(),
    userId: vine.number().optional(),
    startDate: vine.string().trim(),
    endDate: vine.string().trim(),
    startTime: vine.string().trim().optional(),
    endTime: vine.string().trim().optional(),
    isAllDay: vine.boolean(),
  })
)

