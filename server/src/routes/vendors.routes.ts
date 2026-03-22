import { Router } from 'express';
import { VendorsService } from '../services/vendors.service.js';
import { ApiError, asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';
import { createVendorSchema, updateVendorSchema, vendorQuerySchema } from '../validation/vendors.validation.js';
import { idParamSchema } from '../validation/common.js';

const router = Router();
const service = new VendorsService();

router.get('/', validate(vendorQuerySchema), asyncHandler(async (req, res) => {
  ok(res, await service.list({ status: req.query.status as string | undefined, q: req.query.q as string | undefined }));
}));

router.get('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  const vendor = await service.getById(req.params.id);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  ok(res, vendor);
}));

router.post('/', validate(createVendorSchema), asyncHandler(async (req, res) => {
  ok(res, await service.create(req.body), 'Vendor created');
}));

router.put('/:id', validate(updateVendorSchema), asyncHandler(async (req, res) => {
  ok(res, await service.update(req.params.id, req.body), 'Vendor updated');
}));

router.delete('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  ok(res, await service.remove(req.params.id), 'Vendor deleted');
}));

export default router;
