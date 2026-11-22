import { Router } from 'express';
import { login, me, signup } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { loginBody, signupBody } from '../validators/auth.js';

const router = Router();

router.post('/signup', authLimiter, validate({ body: signupBody }), signup);
router.post('/login', authLimiter, validate({ body: loginBody }), login);
router.get('/me', authenticate, me);

export default router;
