import { REFUND_RULES } from '../config/booking.js';

const MS_PER_HOUR = 3600000;

export function calculateRefund({ grandTotalPaise, checkInAt }, now = new Date(), rules = REFUND_RULES) {
  if (!Number.isSafeInteger(grandTotalPaise) || grandTotalPaise < 0) {
    throw new RangeError('Expected a nonnegative integer grand total in paise');
  }
  const remainingMs = checkInAt.getTime() - now.getTime();
  if (!Number.isFinite(remainingMs)) throw new RangeError('Expected valid cancellation and check-in times');
  const cancellable = remainingMs > 0;
  const rule = cancellable && rules.find(({ minHoursBeforeCheckIn, exclusive }) => {
    const threshold = minHoursBeforeCheckIn * MS_PER_HOUR;
    return exclusive ? remainingMs > threshold : remainingMs >= threshold;
  });
  const bps = rule?.refundBps ?? 0;
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) throw new RangeError('Invalid refund rate');
  const refundPaise = Number(BigInt(grandTotalPaise) * BigInt(bps) / 10000n);
  return { cancellable, percent: bps / 100, refundPaise, hoursBeforeCheckIn: remainingMs / MS_PER_HOUR };
}
