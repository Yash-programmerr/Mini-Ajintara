import { z } from 'zod';

const text = (min, max) => z.string().trim().min(min).max(max);
const imageUrl = z.string().trim().startsWith('https://').pipe(z.url({ protocol: /^https$/ }));
const propertyFields = z.object({
  name: text(3, 100),
  city: text(2, 60),
  address: text(5, 200),
  description: text(10, 2000),
  amenities: z.array(text(1, 40)).max(30).transform((items) => [...new Set(items)]),
  images: z.array(imageUrl).min(1).max(10),
}).strict();

export const createPropertyBody = propertyFields;
export const updatePropertyBody = propertyFields.partial()
  .refine((data) => Object.keys(data).length > 0, 'Supply at least one property field');

export const nightlyPrice = z.number().int().min(100).max(10000000);
export const roomCount = z.number().int().min(1).max(500);
export const createRoomTypeBody = z.object({
  name: text(2, 60),
  basePricePaise: nightlyPrice,
  totalRooms: roomCount,
  maxGuests: z.number().int().min(1).max(20),
}).strict();
export const updateRoomTypeBody = createRoomTypeBody.pick({ name: true, maxGuests: true })
  .partial().refine((data) => Object.keys(data).length > 0, 'Supply a name or maximum guest count');

export const reviewBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), reason: text(0, 300).optional() }).strict(),
  z.object({ action: z.literal('reject'), reason: text(5, 300) }).strict(),
]);
export const adminPropertiesQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  page: z.coerce.number().int().positive().max(Math.floor(Number.MAX_SAFE_INTEGER / 50)).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();
