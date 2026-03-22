import { Router } from 'express';
import { VendorsService, vendorInputSchema } from '../services/vendors.service.js';
import { ApiError, asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';

const router = Router();
const service = new VendorsService();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    ok(res, await service.list(req.query.status as string | undefined));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const vendor = await service.getById(req.params.id);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    ok(res, vendor);
  }),
);

router.post(
  '/',
  validate(vendorInputSchema),
  asyncHandler(async (req, res) => {
    ok(res, await service.create(req.body), 'Vendor created');
  }),
);

export default router;
