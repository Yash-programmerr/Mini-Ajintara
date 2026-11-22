import { Router } from 'express';

const router = Router();

// Replaced by A3 (Razorpay order, verify, webhook).
router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Payment routes are not implemented yet' },
  });
});

export default router;
