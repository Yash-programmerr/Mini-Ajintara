// GST slabs for a room night, expressed in integer paise and basis points.
// A price at or below the first ceiling uses 5%; anything above uses 18%.
export const GST_SLABS = Object.freeze([
  Object.freeze({ maxPricePaise: 750000, rateBps: 500 }),
  Object.freeze({ maxPricePaise: Infinity, rateBps: 1800 }),
]);
