import { ApiProperty } from '@nestjs/swagger';

export class DailyCountDto {
  @ApiProperty({ example: '2026-09-18' })
  date!: string;

  @ApiProperty()
  count!: number;
}

export class ErrorTypeCountDto {
  @ApiProperty()
  type!: string;

  @ApiProperty()
  count!: number;
}

export class SystemIssueCountDto {
  @ApiProperty()
  systemId!: number;

  @ApiProperty()
  systemName!: string;

  @ApiProperty()
  openCount!: number;

  @ApiProperty()
  totalCount!: number;
}

export class KpiOverviewResponseDto {
  @ApiProperty()
  totalSystems!: number;

  @ApiProperty()
  totalIssues!: number;

  @ApiProperty()
  openIssues!: number;

  @ApiProperty()
  resolvedIssues!: number;

  @ApiProperty()
  ignoredIssues!: number;

  @ApiProperty({ type: [DailyCountDto] })
  eventsLast7Days!: DailyCountDto[];

  @ApiProperty({ type: [ErrorTypeCountDto] })
  topErrorTypes!: ErrorTypeCountDto[];

  @ApiProperty({ type: [SystemIssueCountDto] })
  issuesBySystem!: SystemIssueCountDto[];
}
