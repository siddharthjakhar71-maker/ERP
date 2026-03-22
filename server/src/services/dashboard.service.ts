import { dashboardSnapshot } from './mock-data.js';

export class DashboardService {
  async getSnapshot() {
    return dashboardSnapshot;
  }
}
