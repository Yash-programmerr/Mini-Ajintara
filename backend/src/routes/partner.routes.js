import { Router } from 'express';

import * as partner from '../controllers/partner.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParams as params } from '../validators/common.js';
import { inventoryQuery, updateInventoryBody } from '../validators/inventory.js';
import { createPropertyBody, updatePropertyBody, createRoomTypeBody, updateRoomTypeBody } from '../validators/property.js';

const router = Router();
router.use(authenticate, authorize('partner'));

router.get('/properties', partner.listProperties);
router.post('/properties', validate({ body: createPropertyBody }), partner.createProperty);
router.get('/properties/:id', validate({ params }), partner.getProperty);
router.patch('/properties/:id', validate({ params, body: updatePropertyBody }), partner.updateProperty);
router.post('/properties/:id/room-types', validate({ params, body: createRoomTypeBody }), partner.createRoomType);
router.patch('/room-types/:id', validate({ params, body: updateRoomTypeBody }), partner.updateRoomType);
router.get('/room-types/:id/inventory', validate({ params, query: inventoryQuery }), partner.getInventory);
router.put('/room-types/:id/inventory', validate({ params, body: updateInventoryBody }), partner.updateInventory);

router.use((_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Partner routes are not implemented yet' },
  });
});

export default router;
