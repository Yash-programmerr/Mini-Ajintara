import { expect, it } from 'vitest';
import { buildStay } from '../src/services/stay.js';
import { dateString } from '../src/validators/common.js';
import { addDays, checkInInstant, checkOutInstant, isValidDateString, nightsBetween, todayIST } from '../src/utils/time.js';

it('converts configured IST arrival and departure times into instants', () => {
  expect(checkInInstant('2026-12-24').toISOString()).toBe('2026-12-24T08:30:00.000Z');
  expect(checkOutInstant('2026-12-24').toISOString()).toBe('2026-12-24T06:30:00.000Z');
});

it('changes the booking day at IST midnight', () => {
  expect(todayIST('2026-12-23T18:29:59Z')).toBe('2026-12-23');
  expect(todayIST('2026-12-23T18:30:00Z')).toBe('2026-12-24');
});

it.each([
  ['2026-12-24', '2026-12-26', ['2026-12-24', '2026-12-25']],
  ['2026-12-30', '2027-01-02', ['2026-12-30', '2026-12-31', '2027-01-01']],
  ['2028-02-28', '2028-03-01', ['2028-02-28', '2028-02-29']],
  ['2026-02-28', '2026-03-01', ['2026-02-28']],
])('enumerates nights from %s up to %s', (start, end, nights) => {
  expect(nightsBetween(start, end)).toEqual(nights);
  expect(addDays(end, -nights.length)).toBe(start);
});

it.each(['2026-02-30', '2026-2-3', '2026-12-24T00:00:00Z', '', null])('rejects %s', (value) => {
  expect(isValidDateString(value)).toBe(false);
  expect(dateString.safeParse(value).success).toBe(false);
});

const now = new Date('2026-12-23T19:00:00Z');
it('allows today and a stay of exactly 30 nights', () => {
  const start = '2026-12-24';
  const end = '2026-12-25';
  expect(buildStay(start, end, now)).toEqual({
    checkInDate: start, checkOutDate: end, nightCount: 1, nights: [start],
    checkInAt: checkInInstant(start), checkOutAt: checkOutInstant(end),
  });
  expect(buildStay(start, addDays(start, 30), now).nightCount).toBe(30);
});

it.each([
  ['2026-12-23', '2026-12-25', 'CHECKIN_IN_PAST'],
  ['2026-12-24', '2026-12-24', 'CHECKOUT_BEFORE_CHECKIN'],
  ['2026-12-24', '2026-12-23', 'CHECKOUT_BEFORE_CHECKIN'],
  ['2026-12-24', '2027-01-24', 'STAY_TOO_LONG'],
  ['2026-2-3', '2026-12-25', 'INVALID_DATE'],
])('validates stay %s to %s', (start, end, code) => {
  expect(() => buildStay(start, end, now)).toThrow(expect.objectContaining({ status: 400, code }));
});
