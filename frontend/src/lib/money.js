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
