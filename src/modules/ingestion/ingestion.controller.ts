import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from './api-key.guard';
import { IngestAcceptedResponseDto, IngestEventDto } from './ingestion.dto';
import type { IngestionRequest } from './ingestion-request.interface';
import { SqliteQueueService } from './sqlite-queue.service';

@ApiTags('ingestion')
@ApiHeader({
  name: 'X-Beacon-Key',
  description: "The reporting system's API key",
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('events')
export class IngestionController {
  constructor(private readonly queue: SqliteQueueService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Report an error event; queued and processed asynchronously',
  })
  @ApiResponse({ status: 202, type: IngestAcceptedResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async ingest(
    @Req() request: IngestionRequest,
    @Body() dto: IngestEventDto,
  ): Promise<IngestAcceptedResponseDto> {
    await this.queue.enqueue(request.system.id, dto);
    return { status: 'queued' };
  }
}
