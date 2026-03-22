import type { Config } from 'drizzle-kit';

export default {
  schema: '../shared/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/jakhira.db',
  },
} satisfies Config;
