import { z } from 'zod';
import { dateString } from './common.js';
import { nightlyPrice, roomCount } from './property.js';

export const inventoryQuery = z.object({ from: dateString, to: dateString }).strict();
export const updateInventoryBody = inventoryQuery.extend({
  pricePaise: nightlyPrice.optional(),
  totalRooms: roomCount.optional(),
}).strict().refine((data) => data.pricePaise !== undefined || data.totalRooms !== undefined,
  'Supply a price or room count');
