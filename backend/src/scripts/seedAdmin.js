import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../config/auth.js';
import User from '../models/User.js';
import { databaseCommand } from './databaseCommand.js';

await databaseCommand({ write: true, admin: true }, async ({ account, log }) => {
  const { name, email, password } = account;
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
  log('Admin seed complete.');
});
