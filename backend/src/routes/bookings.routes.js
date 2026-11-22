import { Router } from 'express';

const router = Router();

// Replaced by A3/A4 (holds, confirmation, cancellation).
router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Booking routes are not implemented yet' },
  });
});

export default router;
