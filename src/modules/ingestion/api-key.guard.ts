import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { hashApiKey } from '../../common/api-key.util';
import { SystemsService } from '../systems/systems.service';
import type { IngestionRequest } from './ingestion-request.interface';

const API_KEY_HEADER = 'x-beacon-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly systemsService: SystemsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IngestionRequest>();
    const header = request.headers[API_KEY_HEADER];
    const apiKey = Array.isArray(header) ? header[0] : header;

    if (!apiKey) {
      throw new UnauthorizedException(`Missing ${API_KEY_HEADER} header`);
    }

    const system = await this.systemsService.findByApiKeyHash(
      hashApiKey(apiKey),
    );
    if (!system) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.system = system;
    return true;
  }
}
