const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

// Money crosses the API as integer paise; divide only when presenting it.
export function formatINR(paise) {
  if (!Number.isInteger(paise)) {
    throw new TypeError('formatINR expects an integer amount in paise');
  }

  return inrFormatter.format(paise / 100);
}

export function parseRupeesToPaise(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const paise = Number(match[1] + (match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}

export function rupeesFromPaise(paise) {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new TypeError('Expected non-negative integer paise');
  const digits = String(paise).padStart(3, '0');
  return digits.slice(0, -2) + '.' + digits.slice(-2);
}
