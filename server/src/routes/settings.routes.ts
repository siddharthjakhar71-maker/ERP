import { Router } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { asyncHandler, ok } from '../utils/http.js';
import { validate } from '../utils/validate.js';
import { updateLayoutSettingsSchema, updateTemplateSettingsSchema, updateThemeSettingsSchema } from '../validation/settings.validation.js';

const router = Router();
const service = new SettingsService();

router.get('/', asyncHandler(async (_req, res) => {
  ok(res, await service.getSettings());
}));

router.put('/theme', validate(updateThemeSettingsSchema), asyncHandler(async (req, res) => {
  ok(res, await service.updateTheme(req.body), 'Theme settings updated');
}));

router.put('/po-template', validate(updateTemplateSettingsSchema), asyncHandler(async (req, res) => {
  ok(res, await service.updateTemplate(req.body), 'PO template settings updated');
}));

router.put('/po-layout', validate(updateLayoutSettingsSchema), asyncHandler(async (req, res) => {
  ok(res, await service.updateLayout(req.body), 'PO layout settings updated');
}));

export default router;
