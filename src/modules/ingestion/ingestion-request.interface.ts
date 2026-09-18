import type { Request } from 'express';
import type { System } from '../../database/schema';

export interface IngestionRequest extends Request {
  system: System;
}
