import { Router } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { asyncHandler, ok } from '../utils/http.js';

const router = Router();
const service = new DashboardService();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await service.getSnapshot());
  }),
);

export default router;
