import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function toAppError(error) {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError || error?.name === 'ZodError') {
    return new AppError(
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError(400, 'INVALID_ID', `Invalid value for "${error.path}"`);
  }

  if (error?.code === 11000) {
    return new AppError(
      409,
      'DUPLICATE_KEY',
      'A record with that value already exists',
      Object.keys(error.keyValue ?? {}),
    );
  }

  if (error instanceof jwt.TokenExpiredError) {
    return new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired');
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return new AppError(401, 'INVALID_TOKEN', 'Invalid authentication token');
  }

  if (error?.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the size limit');
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return new AppError(400, 'INVALID_JSON', 'Request body contains invalid JSON');
  }

  return new AppError(
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : error.message || 'Something went wrong',
  );
}

// Express identifies error handlers by arity, so `_next` must stay.
export function errorHandler(error, req, res, _next) {
  const appError = toAppError(error);

  if (appError.status >= 500) {
    console.error(`[error] ${req.method} ${req.route?.path ?? '-'} ${appError.status} ${appError.code}`);
  }

  const payload = { code: appError.code, message: appError.message };
  if (appError.details !== undefined) payload.details = appError.details;

  res.status(appError.status).json({ error: payload });
}
