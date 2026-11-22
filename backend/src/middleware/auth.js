import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { JWT_ALGORITHM } from '../config/auth.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const authRequired = () => new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
const invalidToken = () => new AppError(401, 'TOKEN_INVALID', 'Invalid authentication token');

export async function authenticate(req, _res, next) {
  const header = req.get('Authorization');
  if (!header) throw authRequired();
  const match = /^Bearer +([^\s]+)$/i.exec(header);
  if (!match) throw invalidToken();
  let payload;
  try {
    payload = jwt.verify(match[1], env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch {
    throw invalidToken();
  }
  if (!mongoose.isObjectIdOrHexString(payload.sub)) throw invalidToken();
  const user = await User.findById(payload.sub);
  if (!user) throw authRequired();
  if (user.isBlocked) throw new AppError(403, 'BLOCKED', 'Account blocked');
  req.user = user;
  next();
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw authRequired();
    if (!roles.includes(req.user.role)) throw new AppError(403, 'FORBIDDEN', 'Access forbidden');
    next();
  };
}
