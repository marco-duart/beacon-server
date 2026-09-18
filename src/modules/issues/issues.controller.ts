import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EventResponseDto } from '../events/events.dto';
import { toEventResponse } from '../events/events.mapper';
import { EventsService } from '../events/events.service';
import {
  FindIssuesQueryDto,
  IssueResponseDto,
  PaginatedIssuesResponseDto,
  UpdateIssueStatusDto,
} from './issues.dto';
import { toIssueResponse, toPaginatedIssuesResponse } from './issues.mapper';
import { IssuesService } from './issues.service';

@ApiTags('issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('issues')
export class IssuesController {
  constructor(
    private readonly issuesService: IssuesService,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List issues (paginated), optionally filtered by system, status or level',
  })
  async findAll(
    @Query() query: FindIssuesQueryDto,
  ): Promise<PaginatedIssuesResponseDto> {
    const paginated = await this.issuesService.findAll(query);
    return toPaginatedIssuesResponse(paginated);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single issue' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<IssueResponseDto> {
    const issue = await this.issuesService.findOne(id);
    return toIssueResponse(issue);
  }

  @Get(':id/events')
  @ApiOperation({
    summary: 'List the most recent raw events reported for an issue',
  })
  async findEvents(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EventResponseDto[]> {
    await this.issuesService.findOne(id);
    const events = await this.eventsService.findByIssue(id);
    return events.map(toEventResponse);
  }

  @Patch(':id/status')
  @Roles('admin', 'member')
  @ApiOperation({
    summary: 'Resolve, ignore or reopen an issue (admin/member only)',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIssueStatusDto,
  ): Promise<IssueResponseDto> {
    const issue = await this.issuesService.updateStatus(id, dto.status);
    return toIssueResponse(issue);
  }
}
