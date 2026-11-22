import { MAX_STAY_NIGHTS } from '../config/booking.js';
import { AppError } from '../utils/AppError.js';
import { checkInInstant, checkOutInstant, isValidDateString, nightsBetween, todayIST } from '../utils/time.js';

export function buildStay(checkIn, checkOut, now = new Date()) {
  if (!isValidDateString(checkIn) || !isValidDateString(checkOut)) {
    throw new AppError(400, 'INVALID_DATE', 'Enter valid check-in and checkout dates');
  }
  if (checkIn < todayIST(now)) throw new AppError(400, 'CHECKIN_IN_PAST', 'Check-in date is in the past');
  if (checkOut <= checkIn) throw new AppError(400, 'CHECKOUT_BEFORE_CHECKIN', 'Checkout must follow check-in');

  // UTC midnights measure calendar days before allocating the list of nights.
  const nightCount = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  if (nightCount > MAX_STAY_NIGHTS) {
    throw new AppError(400, 'STAY_TOO_LONG', `Stay exceeds ${MAX_STAY_NIGHTS} nights`);
  }
  return {
    checkInDate: checkIn, checkOutDate: checkOut, nights: nightsBetween(checkIn, checkOut),
    nightCount, checkInAt: checkInInstant(checkIn), checkOutAt: checkOutInstant(checkOut),
  };
}
