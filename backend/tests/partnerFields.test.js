import { expect, it } from 'vitest';
import { imageUrl, rangeSchema, roomCreateSchema } from '../../frontend/src/lib/propertyFields.js';

it.each(['http://example.com/image', 'javascript:alert(1)', 'data:image/png,abc'])(
  'rejects a non-HTTPS property image %s', (url) => expect(imageUrl.safeParse(url).success).toBe(false));

it('parses room prices as paise and requires whole room and guest counts', () => {
  const form = { name: 'Suite', basePricePaise: '7500.01', totalRooms: '3', maxGuests: '2' };
  expect(roomCreateSchema.parse(form)).toEqual({ ...form, basePricePaise: 750001, totalRooms: 3, maxGuests: 2 });
  expect(roomCreateSchema.safeParse({ ...form, maxGuests: '2.5' }).success).toBe(false);
});

it('submits the selected dates and omits an unchanged field', () => {
  const schema = rangeSchema('2026-03-06', '2027-03-05');
  const fields = { from: '2026-03-07', to: '2026-03-09', pricePaise: '50.05', totalRooms: '' };
  expect(schema.parse(fields)).toEqual({ from: fields.from, to: fields.to, pricePaise: 5005 });
  expect(schema.parse({ ...fields, pricePaise: '', totalRooms: '1' })).toEqual({
    from: fields.from, to: fields.to, totalRooms: 1,
  });
  for (const invalid of [{ to: fields.from, from: fields.to }, { to: '2027-03-07' }, { pricePaise: '' }]) {
    expect(schema.safeParse({ ...fields, ...invalid }).success).toBe(false);
  }
});
