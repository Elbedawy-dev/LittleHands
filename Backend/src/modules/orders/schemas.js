import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX, EGYPTIAN_GOVERNORATES, ORDER_STATUSES } from '../../config/constants.js'

export const orderItemSchema = z
  .object({
    productId: z.string().min(1, 'Product ID is required'),
    qty: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50'),
    unitPrice: z.coerce.number().optional(),
    price: z.coerce.number().optional(),
    name: z.any().optional(),
    image: z.any().optional(),
    sellerId: z.string().optional(),
  })
  .strict()

export const deliveryAddressSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    phone: z.string().trim().regex(EGYPTIAN_PHONE_REGEX, 'Invalid Egyptian phone number'),
    governorate: z.string().trim().refine((val) => EGYPTIAN_GOVERNORATES.includes(val), {
      message: 'Invalid Egyptian governorate',
    }),
    city: z.string().trim().min(2, 'City must be at least 2 characters').max(100),
    address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255),
    nurseryName: z.string().trim().max(100).optional().default(''),
  })
  .strict()

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1, 'Order must contain at least 1 item').max(30, 'Order cannot exceed 30 items'),
    delivery: deliveryAddressSchema,
    notes: z.string().trim().max(500).optional().default(''),
  })
  .strict()

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES, {
      errorMap: () => ({ message: 'Invalid order status' }),
    }),
  })
  .strict()

export const setSellerOrderStatusSchema = z
  .object({
    status: z.enum(['preparing', 'shipped'], {
      errorMap: () => ({ message: 'Status must be preparing or shipped' }),
    }),
  })
  .strict()

export const cancelOrderSchema = z
  .object({
    reason: z.string().trim().max(255).optional(),
  })
  .strict()

export const refundOrderSchema = z
  .object({
    reference: z.string().trim().min(1, 'Reference is required').max(100),
    note: z.string().trim().max(500).optional().default(''),
  })
  .strict()

export const orderQuerySchema = z.object({
  status: z.string().optional(),
  sellerId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  archived: z.union([z.string(), z.boolean()]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export const orderIdParamSchema = z.object({
  id: z.string().min(1),
})

export default {
  createOrderSchema,
  updateOrderStatusSchema,
  setSellerOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
  orderIdParamSchema,
}
