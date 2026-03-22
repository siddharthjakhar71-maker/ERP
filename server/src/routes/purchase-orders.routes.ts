import { Router } from 'express';
import { PurchaseOrderService } from '../services/purchaseOrder.service.js';
import { ApiError, asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';
import { idParamSchema } from '../validation/common.js';
import { createPurchaseOrderSchema, purchaseOrderQuerySchema, updatePurchaseOrderSchema } from '../validation/purchase-orders.validation.js';

const router = Router();
const service = new PurchaseOrderService();

router.get('/', validate(purchaseOrderQuerySchema), asyncHandler(async (req, res) => {
  ok(res, await service.list({ status: req.query.status as string | undefined, q: req.query.q as string | undefined }));
}));

router.get('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  const purchaseOrder = await service.getById(req.params.id as string);
  if (!purchaseOrder) throw new ApiError(404, 'Purchase order not found');
  ok(res, purchaseOrder);
}));

router.post('/', validate(createPurchaseOrderSchema), asyncHandler(async (req, res) => {
  ok(res, await service.create(req.body), 'Purchase order created');
}));

router.put('/:id', validate(updatePurchaseOrderSchema), asyncHandler(async (req, res) => {
  ok(res, await service.update(req.params.id as string, req.body), 'Purchase order updated');
}));

router.delete('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  ok(res, await service.remove(req.params.id as string), 'Purchase order deleted');
}));

export default router;
