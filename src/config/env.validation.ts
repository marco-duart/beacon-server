import { Type, plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsIn(Object.values(Environment))
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT = 3000;

  @IsString()
  @IsOptional()
  CORS_ORIGIN = 'http://localhost:5173';

  @IsString()
  @IsOptional()
  DATABASE_PATH = './data/beacon.sqlite';

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '12h';

  @Type(() => Number)
  @IsInt()
  @Min(20)
  @IsOptional()
  QUEUE_POLL_INTERVAL_MS = 200;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  QUEUE_BATCH_SIZE = 25;

  @IsString()
  @IsOptional()
  RETENTION_CRON = '0 * * * *';

  @IsString()
  @IsOptional()
  EMAIL_PROVIDER?: string;

  @IsString()
  @IsOptional()
  SENDGRID_API_KEY?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validatedConfig;
}
