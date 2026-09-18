import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import {
  RETENTION_POLICIES,
  type RetentionPolicy,
} from '../../common/retention-policy';

export class CreateSystemDto {
  @ApiProperty({ example: 'Checkout API' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ enum: RETENTION_POLICIES, default: 'unlimited' })
  @IsOptional()
  @IsIn(RETENTION_POLICIES)
  retentionPolicy?: RetentionPolicy;

  @ApiPropertyOptional({
    description: 'Comma-separated e-mails notified when a new issue is created',
    example: 'oncall@example.com,tech-lead@example.com',
  })
  @IsOptional()
  @IsString()
  notifyEmails?: string;
}

export class UpdateSystemDto {
  @ApiPropertyOptional({ example: 'Checkout API' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: RETENTION_POLICIES })
  @IsOptional()
  @IsIn(RETENTION_POLICIES)
  retentionPolicy?: RetentionPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notifyEmails?: string;
}

export class SystemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({
    description: 'Non-secret fragment of the API key, e.g. "bcn_live_9f3a1c2d"',
  })
  apiKeyPrefix!: string;

  @ApiProperty({ enum: RETENTION_POLICIES })
  retentionPolicy!: RetentionPolicy;

  @ApiPropertyOptional()
  notifyEmails!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class SystemCreatedResponseDto extends SystemResponseDto {
  @ApiProperty({
    description: 'Plaintext API key — shown only once, store it now',
  })
  apiKey!: string;
}
