import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { BCRYPT_COST } from '../config/auth.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { signupBody } from '../validators/auth.js';

async function seed() {
  const input = signupBody.omit({ role: true }).safeParse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!input.success) throw new Error('Invalid admin configuration');
  const { name, email, password } = input.data;

  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  await User.init();
  if (!(await User.exists({ email }))) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    try {
      await User.create({ name, email, passwordHash, role: 'admin' });
    } catch (error) {
      // Another seed or signup may have claimed this email after the lookup.
      if (error.code !== 11000) throw error;
    }
  }
  console.log(email);
}

try {
  await seed();
} catch {
  console.error('Admin seed failed. Check the admin settings and database connection.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
