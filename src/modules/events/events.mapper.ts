import type { Event } from '../../database/schema';
import type { EventResponseDto } from './events.dto';

function parseJsonField<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function toEventResponse(event: Event): EventResponseDto {
  return {
    id: event.id,
    issueId: event.issueId,
    message: event.message,
    stacktrace: parseJsonField<string | Record<string, unknown>[]>(
      event.stacktrace,
    ),
    environment: event.environment,
    release: event.release,
    tags: parseJsonField<Record<string, string>>(event.tags),
    extra: parseJsonField<Record<string, unknown>>(event.extra),
    timestamp: event.timestamp,
    receivedAt: event.receivedAt,
  };
}
