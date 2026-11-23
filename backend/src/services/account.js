import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../config/auth.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export async function createAccount({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    return await User.create({ name, email, passwordHash, role });
  } catch (error) {
    if (error.code === 11000) throw new AppError(409, 'EMAIL_TAKEN', 'Email already in use');
    throw error;
  }
}
