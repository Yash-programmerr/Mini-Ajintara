import { expect, it } from 'vitest';
import { formatINR } from '../../frontend/src/lib/money.js';

it.each([
  [0, '₹0.00'],
  [1, '₹0.01'],
  [-105, '-₹1.05'],
  [12345678, '₹1,23,456.78'],
])('formats %i integer paise for the UI', (paise, formatted) => {
  expect(formatINR(paise)).toBe(formatted);
});

it.each([0.5, '100', NaN])('rejects invalid paise input %s', (value) => {
  expect(() => formatINR(value)).toThrow(TypeError);
});
