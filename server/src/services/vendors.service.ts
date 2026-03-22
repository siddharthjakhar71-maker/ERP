import { z } from 'zod';
import { vendors } from './mock-data.js';

export const vendorInputSchema = z.object({
  body: z.object({
    code: z.string().min(2),
    name: z.string().min(2),
    contactPerson: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    city: z.string().min(2),
    paymentTermsDays: z.number().min(0),
    status: z.enum(['active', 'inactive', 'on_hold']),
  }),
  query: z.object({}).default({}),
  params: z.object({}).default({}),
});

export class VendorsService {
  async list(status?: string) {
    return status ? vendors.filter((vendor) => vendor.status === status) : vendors;
  }

  async getById(id: string) {
    return vendors.find((vendor) => vendor.id === id);
  }

  async create(input: z.infer<typeof vendorInputSchema>['body']) {
    const record = {
      id: `ven_${vendors.length + 1}`,
      ...input,
      openingBalance: 0,
      outstandingBalance: 0,
      recentTransactions: [],
    };

    vendors.unshift(record);
    return record;
  }
}
