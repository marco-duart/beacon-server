import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { count, eq } from 'drizzle-orm';
import { generateTempPassword } from '../../common/password.util';
import { DRIZZLE } from '../../database/database.constants';
import type { DrizzleDatabase } from '../../database/database.provider';
import { users, type User, type UserRole } from '../../database/schema';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async findById(id: number): Promise<User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  findAll(): Promise<User[]> {
    return this.db.select().from(users).orderBy(users.email);
  }

  async create(
    email: string,
    plainPassword: string,
    role: UserRole = 'member',
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const [user] = await this.db
      .insert(users)
      .values({ email, passwordHash, role })
      .returning();
    return user;
  }

  async updateRole(
    id: number,
    role: UserRole,
    actingUserId: number,
  ): Promise<User> {
    const target = await this.findById(id);

    if (target.id === actingUserId && role !== 'admin') {
      throw new ForbiddenException('You cannot change your own role');
    }
    if (
      target.role === 'admin' &&
      role !== 'admin' &&
      (await this.countAdmins()) <= 1
    ) {
      throw new ConflictException('Cannot demote the last remaining admin');
    }

    const [updated] = await this.db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async remove(id: number, actingUserId: number): Promise<void> {
    const target = await this.findById(id);

    if (target.id === actingUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    if (target.role === 'admin' && (await this.countAdmins()) <= 1) {
      throw new ConflictException('Cannot delete the last remaining admin');
    }

    await this.db.delete(users).where(eq(users.id, id));
  }

  async resetPassword(
    id: number,
  ): Promise<{ user: User; plainPassword: string }> {
    const plainPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    const [user] = await this.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return { user, plainPassword };
  }

  verifyPassword(
    plainPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  private async countAdmins(): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'));
    return row?.value ?? 0;
  }
}
