import { expect, it } from 'vitest';
import { calculateRefund } from '../src/services/refund.js';
import { checkInInstant } from '../src/utils/time.js';

const checkInAt = checkInInstant('2026-12-24');
const booking = { checkInAt, grandTotalPaise: 1416501 };
const hour = 3600000;

it.each([
  [48 * hour + 1, true, 100, 1416501],
  [48 * hour, true, 50, 708250],
  [24 * hour, true, 50, 708250],
  [24 * hour - 1, true, 0, 0],
  [0, false, 0, 0],
  [-1, false, 0, 0],
])('calculates refund with %i ms remaining', (ms, cancellable, percent, refundPaise) => {
  expect(calculateRefund(booking, new Date(checkInAt.getTime() - ms))).toEqual({
    cancellable, percent, refundPaise, hoursBeforeCheckIn: ms / hour,
  });
});

it('uses the supplied thresholds and percentages', () => {
  const rules = [{ minHoursBeforeCheckIn: 1, refundBps: 2500 }];
  expect(calculateRefund(booking, new Date(checkInAt.getTime() - hour), rules)).toEqual({
    cancellable: true, percent: 25, refundPaise: 354125, hoursBeforeCheckIn: 1,
  });
});
