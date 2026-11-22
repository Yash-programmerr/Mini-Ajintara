import { GST_SLABS } from '../config/tax.js';

function safePaise(value) {
  if (!Number.isSafeInteger(value)) throw new RangeError('Amount exceeds integer paise precision');
  return value;
}

export function calculateBreakdown(nights, qty, slabs = GST_SLABS) {
  if (!Array.isArray(nights) || !nights.length) throw new RangeError('At least one night is required');
  if (!Number.isSafeInteger(qty) || qty < 1) throw new RangeError('Quantity must be a positive integer');

  const lines = [];
  let subtotalPaise = 0;
  let gstTotalPaise = 0;
  for (const night of nights) {
    if (!Number.isSafeInteger(night?.pricePaise) || night.pricePaise < 1) {
      throw new RangeError('Nightly price must be a positive integer in paise');
    }
    const { date, pricePaise } = night;
    const slab = slabs.find(({ maxPricePaise }) => pricePaise <= maxPricePaise);
    if (!Number.isSafeInteger(slab?.rateBps) || slab.rateBps < 0) throw new RangeError('Invalid GST slab');
    const { rateBps } = slab;
    const roomTotalPaise = safePaise(pricePaise * qty);
    // The scaled numerator can exceed Number precision even when the resulting tax fits.
    const gstPaise = safePaise(Number((BigInt(roomTotalPaise) * BigInt(rateBps) + 5000n) / 10000n));
    lines.push({ date, pricePaise, qty, roomTotalPaise, rateBps, gstPaise });
    subtotalPaise = safePaise(subtotalPaise + roomTotalPaise);
    gstTotalPaise = safePaise(gstTotalPaise + gstPaise);
  }
  return { lines, subtotalPaise, gstTotalPaise, grandTotalPaise: safePaise(subtotalPaise + gstTotalPaise) };
}
