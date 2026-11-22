import { z } from 'zod';

const email = z.string().trim().email().transform((value) => value.toLowerCase());

export const signupBody = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password: z.string().min(8).max(72),
  role: z.enum(['guest', 'partner']).default('guest'),
}).strict();

export const loginBody = z.object({
  email,
  password: z.string().min(1),
}).strict();
