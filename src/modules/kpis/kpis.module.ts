import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';

@Module({
  imports: [AuthModule],
  controllers: [KpisController],
  providers: [KpisService],
})
export class KpisModule {}
