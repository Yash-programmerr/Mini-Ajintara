import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

// .env.example ships with empty values. Treat an empty line as "not set" so
// documented defaults apply, while required values still fail validation.
const emptyToUndefined = (value) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const emptyAsUnset = (schema) => z.preprocess(emptyToUndefined, schema);

const envSchema = z.object({
  PORT: emptyAsUnset(z.coerce.number().int().positive().default(5000)),
  NODE_ENV: emptyAsUnset(z.enum(['development', 'test', 'production']).default('development')),
  MONGO_URI: emptyAsUnset(
    z.string({ error: 'MONGO_URI is required' }).min(1, 'MONGO_URI is required'),
  ),
  // A short secret is easy to brute force, so refuse to boot with one.
  JWT_SECRET: emptyAsUnset(
    z
      .string({ error: 'JWT_SECRET is required' })
      .trim()
      .min(32, 'JWT_SECRET must be at least 32 characters'),
  ),
  JWT_EXPIRES_IN: emptyAsUnset(z.string().min(1).default('7d')),
  FRONTEND_URL: emptyAsUnset(z.string().min(1).default('http://localhost:5173')),
  HOLD_MINUTES: emptyAsUnset(z.coerce.number().int().positive().default(10)),
  // Payment keys stay optional until A3 so the foundation can boot without them.
  RAZORPAY_KEY_ID: emptyAsUnset(z.string().optional()),
  RAZORPAY_KEY_SECRET: emptyAsUnset(z.string().optional()),
  RAZORPAY_WEBHOOK_SECRET: emptyAsUnset(z.string().optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );

  console.error(
    [
      '[config] Invalid environment configuration:',
      ...lines,
      '',
      'Copy .env.example to .env in the backend directory and fill in the values.',
    ].join('\n'),
  );
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export const allowedOrigins = Object.freeze(
  env.FRONTEND_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
