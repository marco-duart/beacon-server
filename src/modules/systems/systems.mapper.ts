import type { System } from '../../database/schema';
import type {
  SystemCreatedResponseDto,
  SystemResponseDto,
} from './systems.dto';

export function toSystemResponse(system: System): SystemResponseDto {
  return {
    id: system.id,
    name: system.name,
    slug: system.slug,
    apiKeyPrefix: system.apiKeyPrefix,
    retentionPolicy: system.retentionPolicy,
    notifyEmails: system.notifyEmails,
    createdAt: system.createdAt,
  };
}

export function toSystemCreatedResponse(
  system: System,
  plainKey: string,
): SystemCreatedResponseDto {
  return { ...toSystemResponse(system), apiKey: plainKey };
}
