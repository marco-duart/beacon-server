import type { IngestEventDto } from './ingestion.dto';

export const QUEUE_PORT = Symbol('QUEUE_PORT');

export interface QueuePort {
  enqueue(systemId: number, payload: IngestEventDto): Promise<void>;
}
