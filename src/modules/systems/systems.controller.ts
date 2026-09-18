import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateSystemDto,
  SystemCreatedResponseDto,
  SystemResponseDto,
  UpdateSystemDto,
} from './systems.dto';
import { toSystemCreatedResponse, toSystemResponse } from './systems.mapper';
import { SystemsService } from './systems.service';

@ApiTags('systems')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('systems')
export class SystemsController {
  constructor(private readonly systemsService: SystemsService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Register a new system and issue its ingestion API key',
  })
  async create(
    @Body() dto: CreateSystemDto,
  ): Promise<SystemCreatedResponseDto> {
    const { system, plainKey } = await this.systemsService.create(dto);
    return toSystemCreatedResponse(system, plainKey);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered systems' })
  async findAll(): Promise<SystemResponseDto[]> {
    const systems = await this.systemsService.findAll();
    return systems.map(toSystemResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single system' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SystemResponseDto> {
    const system = await this.systemsService.findOne(id);
    return toSystemResponse(system);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update a system name, retention policy or notification e-mails',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemDto,
  ): Promise<SystemResponseDto> {
    const system = await this.systemsService.update(id, dto);
    return toSystemResponse(system);
  }

  @Post(':id/rotate-key')
  @Roles('admin')
  @ApiOperation({
    summary: 'Invalidate the current API key and issue a new one',
  })
  async rotateKey(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SystemCreatedResponseDto> {
    const { system, plainKey } = await this.systemsService.rotateKey(id);
    return toSystemCreatedResponse(system, plainKey);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a system and all of its issues/events' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: true }> {
    await this.systemsService.remove(id);
    return { success: true };
  }
}
