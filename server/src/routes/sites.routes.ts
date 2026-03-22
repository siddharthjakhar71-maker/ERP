import { Router } from 'express';
import { SitesService } from '../services/sites.service.js';
import { ApiError, asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';
import { idParamSchema } from '../validation/common.js';
import { createSiteSchema, siteQuerySchema, updateSiteSchema } from '../validation/sites.validation.js';

const router = Router();
const service = new SitesService();

router.get('/', validate(siteQuerySchema), asyncHandler(async (req, res) => {
  ok(res, await service.list({ status: req.query.status as string | undefined, q: req.query.q as string | undefined }));
}));

router.get('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  const site = await service.getById(req.params.id);
  if (!site) throw new ApiError(404, 'Site not found');
  ok(res, site);
}));

router.post('/', validate(createSiteSchema), asyncHandler(async (req, res) => {
  ok(res, await service.create(req.body), 'Site created');
}));

router.put('/:id', validate(updateSiteSchema), asyncHandler(async (req, res) => {
  ok(res, await service.update(req.params.id, req.body), 'Site updated');
}));

router.delete('/:id', validate(idParamSchema), asyncHandler(async (req, res) => {
  ok(res, await service.remove(req.params.id), 'Site deleted');
}));

export default router;
