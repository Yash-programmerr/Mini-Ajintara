import { Router } from 'express';

import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, authorize('admin'));

// Replaced by A6 (approvals, users, dashboard).
router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Admin routes are not implemented yet' },
  });
});

export default router;
