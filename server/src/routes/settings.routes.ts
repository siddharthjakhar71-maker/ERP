import { Router } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { asyncHandler, ok } from '../utils/http.js';

const router = Router();
const service = new SettingsService();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await service.getSettings());
  }),
);

export default router;
