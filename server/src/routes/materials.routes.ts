import { Router } from 'express';
import { MaterialsService } from '../services/materials.service.js';
import { ApiError, asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';
import { idParamSchema } from '../validation/common.js';
import { createMaterialSchema, materialQuerySchema, updateMaterialSchema } from '../validation/materials.validation.js';

const router = Router();
const service = new MaterialsService();

router.get('/', validate(materialQuerySchema), asyncHandler(async (req, res) => {
  ok(res, await service.list({
    status: req.query.status as string | undefined,
    category: req.query.category as string | undefined,
    q: req.query.q as string | undefined,
    vendorId: req.query.vendorId as string | undefined,
  }));
}));

router.get('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  const material = await service.getById(req.params.id as string);
  if (!material) throw new ApiError(404, 'Material not found');
  ok(res, material);
}));

router.post('/', validate(createMaterialSchema), asyncHandler(async (req, res) => {
  ok(res, await service.create(req.body), 'Material created');
}));

router.put('/:id', validate(updateMaterialSchema), asyncHandler(async (req, res) => {
  ok(res, await service.update(req.params.id as string, req.body), 'Material updated');
}));

router.delete('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  ok(res, await service.remove(req.params.id as string), 'Material deleted');
}));

export default router;
