import { expect, it } from 'vitest';
import { calculateBreakdown } from '../src/services/pricing.js';

const night = (pricePaise, date = '2026-12-24') => ({ date, pricePaise });

it('prices the worked example from immutable nightly inputs', () => {
  const nights = Object.freeze([Object.freeze(night(800000)), Object.freeze(night(450000, '2026-12-25'))]);
  expect(calculateBreakdown(nights, 1)).toEqual({
    lines: [
      { ...nights[0], qty: 1, roomTotalPaise: 800000, rateBps: 1800, gstPaise: 144000 },
      { ...nights[1], qty: 1, roomTotalPaise: 450000, rateBps: 500, gstPaise: 22500 },
    ],
    subtotalPaise: 1250000, gstTotalPaise: 166500, grandTotalPaise: 1416500,
  });
});

it.each([[750000, 1, 500], [750001, 1, 1800], [500000, 3, 500], [750000, 2, 500]])(
  'selects the slab for %i paise per room at quantity %i', (price, qty, bps) => {
    expect(calculateBreakdown([night(price)], qty).lines[0].rateBps).toBe(bps);
  },
);

it('rounds each half paisa up before adding nights', () => {
  const result = calculateBreakdown([night(10), night(10, '2026-12-25')], 1);
  expect(result.lines.map(line => line.gstPaise)).toEqual([1, 1]);
  expect(result.gstTotalPaise).toBe(2);
});

it('accepts a custom slab above fifteen lakh paise', () => {
  const slabs = Object.freeze([{ maxPricePaise: 1500000, rateBps: 1800 }, { maxPricePaise: Infinity, rateBps: 2800 }]);
  expect(calculateBreakdown([night(1600000)], 1, slabs).gstTotalPaise).toBe(448000);
});

it.each([[[], 1], [[night(1)], 0], [[night(1)], 1.5], [[night(4500.5)], 1], [[night(-1)], 1]])(
  'rejects invalid nights or quantity', (nights, qty) => {
    expect(() => calculateBreakdown(nights, qty)).toThrow(RangeError);
  },
);

it('reconciles all line items over 200 repeatable randomized stays', () => {
  let seed = 42;
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return 1 + seed % max;
  }
  for (let i = 0; i < 200; i++) {
    const nights = Array.from({ length: random(30) }, (_, j) =>
      night(random(2000000), '2026-12-' + String(j + 1).padStart(2, '0')));
    const qty = random(20);
    const { lines, subtotalPaise, gstTotalPaise, grandTotalPaise } = calculateBreakdown(nights, qty);
    for (const { date, ...amounts } of lines) {
      expect(typeof date).toBe('string');
      expect(Object.values(amounts).every(Number.isInteger)).toBe(true);
      expect(amounts.roomTotalPaise).toBe(amounts.pricePaise * qty);
    }
    expect(subtotalPaise).toBe(lines.reduce((sum, line) => sum + line.roomTotalPaise, 0));
    expect(gstTotalPaise).toBe(lines.reduce((sum, line) => sum + line.gstPaise, 0));
    expect(grandTotalPaise).toBe(subtotalPaise + gstTotalPaise);
  }
});
