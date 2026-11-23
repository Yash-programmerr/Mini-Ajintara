import { INVENTORY_DAYS } from '../config/calendar.js';
import { addDays, todayIST } from '../utils/time.js';

function wholeRupeeRate(basePaise, percent) {
  // Each rupee is 100 paise, and each percent is a hundredth of the base.
  return Number((BigInt(basePaise) * BigInt(percent) + 5000n) / 10000n * 100n);
}

export function demoRateRanges(basePaise, now) {
  const ranges = [];
  let day = todayIST(now);
  let previous;
  for (let offset = 0; offset < INVENTORY_DAYS; offset++, day = addDays(day, 1)) {
    const monthDay = day.slice(5);
    const holiday = monthDay >= '12-24' || monthDay === '01-01';
    const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
    const weekend = offset < 60 && (weekday === 5 || weekday === 6);
    if (!holiday && !weekend) {
      previous = undefined;
      continue;
    }
    const pricePaise = wholeRupeeRate(basePaise, holiday ? 140 : 115);
    if (previous?.pricePaise === pricePaise) {
      previous.to = day;
    } else {
      previous = { from: day, to: day, pricePaise };
      ranges.push(previous);
    }
  }
  return ranges;
}
