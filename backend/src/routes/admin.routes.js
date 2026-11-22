import { Router } from 'express';

import { authenticate, authorize } from '../middleware/auth.js';
import * as admin from '../controllers/admin.js';
import { validate } from '../middleware/validate.js';
import { objectIdParams as params } from '../validators/common.js';
import { adminPropertiesQuery, reviewBody } from '../validators/property.js';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/properties', validate({ query: adminPropertiesQuery }), admin.list);
router.get('/properties/:id', validate({ params }), admin.detail);
router.patch('/properties/:id/review', validate({ params, body: reviewBody }), admin.review);

router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Admin routes are not implemented yet' },
  });
});

export default router;
