import { env } from './env.js';

export { TIMEZONE, INVENTORY_DAYS, CHECKIN_TIME, CHECKOUT_TIME } from './calendar.js';
export const HOLD_MINUTES = env.HOLD_MINUTES;

// Refund tiers are ordered from most to least generous. A tier applies when the
// cancellation happens at least `minHoursBeforeCheckIn` before check-in unless the threshold is exclusive.
// Basis points keep percentages exact: 10000 bps = 100%, 5000 bps = 50%.
export const REFUND_RULES = Object.freeze([
  Object.freeze({ minHoursBeforeCheckIn: 48, exclusive: true, refundBps: 10000 }),
  Object.freeze({ minHoursBeforeCheckIn: 24, refundBps: 5000 }),
  Object.freeze({ minHoursBeforeCheckIn: 0, refundBps: 0 }),
]);
export const MAX_STAY_NIGHTS = 30;
