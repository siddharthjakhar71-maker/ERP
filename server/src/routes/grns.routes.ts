import { Router } from 'express';
import { GrnService } from '../services/grn.service.js';
import { validate } from '../utils/validate.js';
import { ApiError, asyncHandler, ok } from '../utils/http.js';
import { idParamSchema } from '../validation/common.js';
import { createGrnSchema, grnQuerySchema, updateGrnSchema } from '../validation/grns.validation.js';

const router = Router();
const service = new GrnService();

router.get('/', validate(grnQuerySchema), asyncHandler(async (req, res) => {
  ok(res, await service.list({ status: req.query.status as string | undefined, purchaseOrderId: req.query.purchaseOrderId as string | undefined, q: req.query.q as string | undefined }));
}));

router.get('/purchase-orders/:id/receipt-options', validate(idParamSchema), asyncHandler(async (req, res) => {
  ok(res, await service.getReceiptOptions(req.params.id as string));
}));

router.get('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  const grn = await service.getById(req.params.id as string);
  if (!grn) throw new ApiError(404, 'GRN not found');
  ok(res, grn);
}));

router.post('/', validate(createGrnSchema), asyncHandler(async (req, res) => {
  ok(res, await service.create(req.body), 'GRN created');
}));

router.put('/:id', validate(updateGrnSchema), asyncHandler(async (req, res) => {
  ok(res, await service.update(req.params.id as string, req.body), 'GRN updated');
}));

router.delete('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  ok(res, await service.remove(req.params.id as string), 'GRN deleted');
}));

export default router;
