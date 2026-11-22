import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { isValidDateString } from '../utils/time.js';

export const dateString = z.string().refine(isValidDateString, 'Expected a calendar date in YYYY-MM-DD format');

export const objectIdParams = z.object({
  id: z.string().transform((value) => {
    if (!/^[a-f\d]{24}$/i.test(value)) throw new AppError(400, 'INVALID_ID', 'Invalid resource ID');
    return value;
  }),
}).strict();
