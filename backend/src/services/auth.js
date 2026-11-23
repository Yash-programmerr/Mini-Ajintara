import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BCRYPT_COST, JWT_ALGORITHM } from '../config/auth.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { createAccount } from './account.js';
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

export async function signup(data) {
  return session(await createAccount(data));
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !matches) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.isBlocked) throw new AppError(403, 'BLOCKED', 'Account blocked');
  return session(user);
}
