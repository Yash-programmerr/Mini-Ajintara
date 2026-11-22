import { CHECKIN_TIME, CHECKOUT_TIME, TIMEZONE } from '../config/booking.js';

const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

function utcDateString(date) {
  const year = date.getUTCFullYear();
  if (!(year >= 0 && year <= 9999)) throw new RangeError('Date outside YYYY-MM-DD range');
  return [String(year).padStart(4, '0'), String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && utcDateString(date) === value;
}

export function todayIST(now = new Date()) {
  return calendar.format(new Date(now));
}

export function addDays(dateStr, n) {
  if (!isValidDateString(dateStr) || !Number.isSafeInteger(n)) throw new RangeError('Invalid date offset');
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + n);
  return utcDateString(date);
}

export function nightsBetween(checkIn, checkOut) {
  if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) throw new RangeError('Invalid stay dates');
  const nights = [];
  for (let day = checkIn; day < checkOut; day = addDays(day, 1)) nights.push(day);
  return nights;
}

function istInstant(dateStr, time) {
  if (!isValidDateString(dateStr)) throw new RangeError('Invalid stay date');
  return new Date(`${dateStr}T${time}:00+05:30`);
}

export const checkInInstant = (dateStr) => istInstant(dateStr, CHECKIN_TIME);
export const checkOutInstant = (dateStr) => istInstant(dateStr, CHECKOUT_TIME);
