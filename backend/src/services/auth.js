import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BCRYPT_COST, JWT_ALGORITHM } from '../config/auth.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

// Unknown emails must incur the same bcrypt work as an incorrect password.
const DUMMY_HASH = bcrypt.hashSync('dummy login comparison', BCRYPT_COST);

function session(user) {
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN,
  });
  return { token, user };
}

export async function signup({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const user = await User.create({ name, email, passwordHash, role });
    return session(user);
  } catch (error) {
    if (error.code === 11000) throw new AppError(409, 'EMAIL_TAKEN', 'Email already in use');
    throw error;
  }
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !matches) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.isBlocked) throw new AppError(403, 'BLOCKED', 'Account blocked');
  return session(user);
}
