import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';

const timeZone = 'Asia/Kolkata';
const isoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const displayDate = { day: '2-digit', month: 'short', year: 'numeric' };
const utcDay = new Intl.DateTimeFormat('en-GB', { ...displayDate, timeZone: 'UTC' });
const istDay = new Intl.DateTimeFormat('en-GB', { ...displayDate, timeZone });
const istTime = new Intl.DateTimeFormat('en-US', {
  timeZone, hour: 'numeric', minute: '2-digit', hour12: true,
});

export function todayIST(now = new Date()) {
  return isoDay.format(new Date(now));
}

export function toDateString(jsDate) {
  return format(jsDate, 'yyyy-MM-dd');
}

export function inventoryMonth(today, offset) {
  const start = parseISO(today);
  const lastNight = toDateString(addDays(start, 364));
  const month = addMonths(startOfMonth(start), offset);
  const monthStart = toDateString(month);
  const monthEnd = toDateString(endOfMonth(month));
  return {
    label: format(month, 'MMMM yyyy'),
    from: monthStart < today ? today : monthStart,
    to: monthEnd > lastNight ? lastNight : monthEnd,
    hasPrevious: monthStart > today,
    hasNext: monthEnd < lastNight,
    lastNight,
  };
}

export function formatStayDate(dateStr) {
  return utcDay.format(new Date(dateStr + 'T00:00:00Z'));
}

export function formatInstantIST(isoString) {
  const instant = new Date(isoString);
  return `${istDay.format(instant)}, ${istTime.format(instant)} IST`;
}

export function nightCount(checkIn, checkOut) {
  return (Date.parse(checkOut + 'T00:00:00Z') - Date.parse(checkIn + 'T00:00:00Z')) / 86400000;
}
