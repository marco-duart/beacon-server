import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KpiOverviewResponseDto } from './kpis.dto';
import { KpisService } from './kpis.service';

@ApiTags('kpis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Global KPIs across all systems' })
  overview(): Promise<KpiOverviewResponseDto> {
    return this.kpisService.overview();
  }

  @Get('systems/:id')
  @ApiOperation({ summary: 'KPIs scoped to a single system' })
  bySystem(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<KpiOverviewResponseDto> {
    return this.kpisService.overview(id);
  }
}
