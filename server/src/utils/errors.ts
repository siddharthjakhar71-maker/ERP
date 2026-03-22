import { ApiError } from './http.js';

export const handleDatabaseError = (error: unknown, entityLabel: string): never => {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    throw new ApiError(409, `${entityLabel} with the same unique value already exists`);
  }

  throw new ApiError(500, `Unable to process ${entityLabel.toLowerCase()} request`);
};
