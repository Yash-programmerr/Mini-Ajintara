import { z } from 'zod';
import { isValidDateString } from '../utils/time.js';

export const dateString = z.string().refine(isValidDateString, 'Expected a calendar date in YYYY-MM-DD format');
