import { parseISO } from 'date-fns';
import { z } from 'zod';
import { parseRupeesToPaise } from './money.js';
import { toDateString } from './date.js';

export const imageUrl = z.string().trim().startsWith('https://', 'Use an HTTPS image URL.')
  .pipe(z.url({ protocol: /^https$/ }));
export const propertySchema = z.object({
  name: z.string().trim().min(3).max(100),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(2000),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30),
  images: z.array(imageUrl).min(1, 'Add at least one image.').max(10),
}).strict();

const nightlyPrice = z.string().transform(parseRupeesToPaise)
  .pipe(z.number({ error: 'Enter a rupee amount with up to two decimals.' }).int()
    .min(100, 'Enter at least ₹1.').max(10000000, 'Enter ₹1,00,000 or less.'));
const roomCount = z.coerce.number().int().min(1).max(500);
export const roomDetailsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  maxGuests: z.coerce.number().int().min(1).max(20),
}).strict();
export const roomCreateSchema = roomDetailsSchema.extend({
  basePricePaise: nightlyPrice,
  totalRooms: roomCount,
});

const pickerDate = z.iso.date().transform((value) => toDateString(parseISO(value)));
export function rangeSchema(today, lastNight) {
  return z.object({
    from: pickerDate, to: pickerDate,
    pricePaise: z.union([z.literal(''), nightlyPrice]), totalRooms: z.union([z.literal(''), roomCount]),
  }).strict().refine(({ from, to }) => from >= today && to >= from && to <= lastNight,
    { message: 'Choose a range within the available window.', path: ['to'] })
    .refine(({ pricePaise, totalRooms }) => pricePaise !== '' || totalRooms !== '',
      { message: 'Enter a price, a room count, or both.', path: ['pricePaise'] })
    .transform(({ from, to, pricePaise, totalRooms }) => ({
      from, to, ...(pricePaise !== '' && { pricePaise }), ...(totalRooms !== '' && { totalRooms }),
    }));
}
