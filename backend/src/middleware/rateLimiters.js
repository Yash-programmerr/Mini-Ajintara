import rateLimit from 'express-rate-limit';

const errorBody = (code, message) => ({ error: { code, message } });

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: errorBody('RATE_LIMITED', 'Too many requests, please try again later'),
});

// Exported for A1; auth routes should mount this before validating credentials.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: errorBody('RATE_LIMITED', 'Too many authentication attempts, please try again later'),
});
