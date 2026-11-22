import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      MONGO_URI: process.env.TEST_REPLICA_URI || 'mongodb://127.0.0.1:27017/ajintara_test',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      FRONTEND_URL: 'http://localhost:5173',
    },
  },
});
