import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ISSUE_LEVELS, type IssueLevel } from '../../database/schema';

export class IngestEventDto {
  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Cannot read properties of undefined',
  })
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiProperty({
    description: 'Error/exception type used for grouping',
    example: 'TypeError',
  })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty({ enum: ISSUE_LEVELS, default: 'error' })
  @IsIn(ISSUE_LEVELS)
  level!: IssueLevel;

  @ApiPropertyOptional({
    description: 'Stack trace, either as raw text or an array of frame objects',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }],
  })
  @IsOptional()
  stacktrace?: string | Record<string, unknown>[];

  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ example: '1.4.2' })
  @IsOptional()
  @IsString()
  release?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'ISO timestamp of when the error happened; defaults to receipt time',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class IngestAcceptedResponseDto {
  @ApiProperty({ example: 'queued' })
  status!: 'queued';
}
