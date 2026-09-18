import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment, EnvironmentVariables } from './env.validation';

export interface EmailConfig {
  provider?: string;
  sendgridApiKey?: string;
  from?: string;
}

export interface QueueConfig {
  pollIntervalMs: number;
  batchSize: number;
}

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  get isProduction(): boolean {
    return (
      this.configService.get('NODE_ENV', { infer: true }) ===
      Environment.Production
    );
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.configService
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get databasePath(): string {
    return this.configService.get('DATABASE_PATH', { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.configService.get('JWT_EXPIRES_IN', { infer: true });
  }

  get queue(): QueueConfig {
    return {
      pollIntervalMs: this.configService.get('QUEUE_POLL_INTERVAL_MS', {
        infer: true,
      }),
      batchSize: this.configService.get('QUEUE_BATCH_SIZE', { infer: true }),
    };
  }

  get retentionCron(): string {
    return this.configService.get('RETENTION_CRON', { infer: true });
  }

  get email(): EmailConfig {
    return {
      provider: this.configService.get('EMAIL_PROVIDER', { infer: true }),
      sendgridApiKey: this.configService.get('SENDGRID_API_KEY', {
        infer: true,
      }),
      from: this.configService.get('EMAIL_FROM', { infer: true }),
    };
  }
}
