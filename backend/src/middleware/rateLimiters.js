import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';

const errorBody = (code, message) => ({ error: { code, message } });

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: errorBody('RATE_LIMITED', 'Too many requests, please try again later'),
});


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: errorBody('RATE_LIMITED', 'Too many authentication attempts, please try again later'),
});
