import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import materialsRoutes from './materials.routes.js';
import purchaseOrdersRoutes from './purchase-orders.routes.js';
import settingsRoutes from './settings.routes.js';
import sitesRoutes from './sites.routes.js';
import vendorsRoutes from './vendors.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/materials', materialsRoutes);
router.use('/sites', sitesRoutes);
router.use('/settings', settingsRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);

const placeholderRoutes = ['grns', 'bills', 'payments', 'stock', 'reports'] as const;

for (const route of placeholderRoutes) {
  router.get(`/${route}`, (_req, res) => {
    res.json({ success: true, message: `${route} endpoint scaffolded for upcoming phase`, data: [] });
  });
}

export default router;
