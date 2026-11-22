import { expect, it } from 'vitest';
import { formatINR, parseRupeesToPaise, rupeesFromPaise } from '../../frontend/src/lib/money.js';

it.each([
  [0, '₹0.00'],
  [1, '₹0.01'],
  [-105, '-₹1.05'],
  [12345678, '₹1,23,456.78'],
])('formats %i integer paise for the UI', (paise, formatted) => {
  expect(formatINR(paise)).toBe(formatted);
});

it.each([['0', 0], ['0.01', 1], [' 10.1 ', 1010], ['7500.00', 750000],
  ['000123.45', 12345], ['90071992547409.91', Number.MAX_SAFE_INTEGER]])(
  'converts %s rupees to exact integer paise and back', (input, paise) => {
    expect(parseRupeesToPaise(input)).toBe(paise);
    expect(parseRupeesToPaise(rupeesFromPaise(paise))).toBe(paise);
  });

it.each(['1.000', '', '.4', '1.', '-1', '1e2', '9,000', '90071992547409.92', 1, null])(
  'rejects invalid input %s', (input) => expect(parseRupeesToPaise(input)).toBeNull());

it('renders input values with two decimal digits', () => {
  expect(rupeesFromPaise(1)).toBe('0.01');
  expect(rupeesFromPaise(750000)).toBe('7500.00');
  expect(() => rupeesFromPaise(10.12)).toThrow(TypeError);
});

it.each([0.5, '100', NaN])('rejects invalid paise input %s', (value) => {
  expect(() => formatINR(value)).toThrow(TypeError);
});
