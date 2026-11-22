import { Router } from 'express';

const router = Router();

// Replaced by A1 (signup, login, me).
router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Auth routes are not implemented yet' },
  });
});

export default router;
