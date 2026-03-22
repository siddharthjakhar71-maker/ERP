import { settings } from './mock-data.js';

export class SettingsService {
  async getSettings() {
    return settings;
  }
}
