import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  issueId!: number;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }],
    nullable: true,
  })
  stacktrace!: string | Record<string, unknown>[] | null;

  @ApiPropertyOptional()
  environment!: string | null;

  @ApiPropertyOptional()
  release!: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  tags!: Record<string, string> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  extra!: Record<string, unknown> | null;

  @ApiProperty()
  timestamp!: Date;

  @ApiProperty()
  receivedAt!: Date;
}
