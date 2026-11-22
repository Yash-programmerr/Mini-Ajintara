import { Router } from 'express';

import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('partner'));

// Replaced by A2 (partner properties, room types, inventory).
router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Partner routes are not implemented yet' },
  });
});

export default router;
