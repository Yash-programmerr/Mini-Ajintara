import { expect, it } from 'vitest';
import { formatInstantIST, formatStayDate, nightCount, todayIST, toDateString } from '../../frontend/src/lib/date.js';

it('displays stay dates and IST instants across browser zones', () => {
  expect(formatStayDate('2026-12-24')).toBe('24 Dec 2026');
  expect(formatInstantIST('2026-12-24T08:30:00Z')).toMatch(/^24 Dec 2026, 2:00\sPM IST$/i);
});

it('uses the local date-picker selection and the IST minimum date', () => {
  expect(toDateString(new Date(2026, 11, 24))).toBe('2026-12-24');
  expect(toDateString(new Date(2026, 11, 24, 23, 59))).toBe('2026-12-24');
  expect(todayIST('2026-12-23T18:30:00Z')).toBe('2026-12-24');
});

it('counts calendar nights across the US spring DST change', () => {
  expect(nightCount('2026-03-07', '2026-03-09')).toBe(2);
});
