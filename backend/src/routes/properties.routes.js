import { Router } from 'express';

const router = Router();

// Replaced by A3 (public search, property details, availability).
router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Property routes are not implemented yet' },
  });
});

export default router;
