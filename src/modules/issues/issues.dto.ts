import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto';
import {
  ISSUE_LEVELS,
  ISSUE_STATUSES,
  type IssueLevel,
  type IssueStatus,
} from '../../database/schema';

export class FindIssuesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => Number(value))
  systemId?: number;

  @ApiPropertyOptional({ enum: ISSUE_STATUSES })
  @IsOptional()
  @IsIn(ISSUE_STATUSES)
  status?: IssueStatus;

  @ApiPropertyOptional({ enum: ISSUE_LEVELS })
  @IsOptional()
  @IsIn(ISSUE_LEVELS)
  level?: IssueLevel;
}

export class UpdateIssueStatusDto {
  @ApiProperty({ enum: ISSUE_STATUSES })
  @IsIn(ISSUE_STATUSES)
  status!: IssueStatus;
}

export class IssueResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  systemId!: number;

  @ApiProperty()
  fingerprint!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: ISSUE_LEVELS })
  level!: IssueLevel;

  @ApiPropertyOptional()
  environment!: string | null;

  @ApiPropertyOptional()
  release!: string | null;

  @ApiProperty({ enum: ISSUE_STATUSES })
  status!: IssueStatus;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  firstSeen!: Date;

  @ApiProperty()
  lastSeen!: Date;
}

export class PaginatedIssuesResponseDto {
  @ApiProperty({ type: [IssueResponseDto] })
  items!: IssueResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
