import { z } from 'zod'

export const getNotificationsQuerySchema = z.object({
  type: z.string().optional(),
  unread: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined
      return val === true || val === 'true'
    }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
})

export const notificationIdParamSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
})

export const deleteNotificationsQuerySchema = z.object({
  read: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === 'true'),
})

export default {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  deleteNotificationsQuerySchema,
}
