import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { generateApiKey } from '../../common/api-key.util';
import { slugify } from '../../common/slugify';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { systems, type System } from '../../database/schema';
import type { CreateSystemDto, UpdateSystemDto } from './systems.dto';

@Injectable()
export class SystemsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async create(
    dto: CreateSystemDto,
  ): Promise<{ system: System; plainKey: string }> {
    const slug = await this.uniqueSlug(dto.name);
    const { plainKey, hash, displayPrefix } = generateApiKey();

    const [system] = await this.db
      .insert(systems)
      .values({
        name: dto.name,
        slug,
        apiKeyHash: hash,
        apiKeyPrefix: displayPrefix,
        retentionPolicy: dto.retentionPolicy ?? 'unlimited',
        notifyEmails: dto.notifyEmails ?? null,
      })
      .returning();

    return { system, plainKey };
  }

  findAll(): Promise<System[]> {
    return this.db.select().from(systems).orderBy(systems.name);
  }

  async findOne(id: number): Promise<System> {
    const [system] = await this.db
      .select()
      .from(systems)
      .where(eq(systems.id, id))
      .limit(1);
    if (!system) {
      throw new NotFoundException(`System ${id} not found`);
    }
    return system;
  }

  async findByApiKeyHash(hash: string): Promise<System | undefined> {
    const [system] = await this.db
      .select()
      .from(systems)
      .where(eq(systems.apiKeyHash, hash))
      .limit(1);
    return system;
  }

  async update(id: number, dto: UpdateSystemDto): Promise<System> {
    await this.findOne(id);
    const [system] = await this.db
      .update(systems)
      .set(dto)
      .where(eq(systems.id, id))
      .returning();
    return system;
  }

  async rotateKey(id: number): Promise<{ system: System; plainKey: string }> {
    await this.findOne(id);
    const { plainKey, hash, displayPrefix } = generateApiKey();
    const [system] = await this.db
      .update(systems)
      .set({ apiKeyHash: hash, apiKeyPrefix: displayPrefix })
      .where(eq(systems.id, id))
      .returning();
    return { system, plainKey };
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.db.delete(systems).where(eq(systems.id, id));
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'system';
    let candidate = base;
    let attempt = 1;
    while (await this.slugTaken(candidate)) {
      attempt += 1;
      candidate = `${base}-${attempt}`;
      if (attempt > 50) {
        throw new ConflictException(
          'Could not generate a unique slug for this system name',
        );
      }
    }
    return candidate;
  }

  private async slugTaken(slug: string): Promise<boolean> {
    const [existing] = await this.db
      .select({ id: systems.id })
      .from(systems)
      .where(eq(systems.slug, slug))
      .limit(1);
    return Boolean(existing);
  }
}
