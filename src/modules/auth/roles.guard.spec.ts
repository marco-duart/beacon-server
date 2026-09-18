import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { UserRole } from '../../database/schema';
import { RolesGuard } from './roles.guard';

function buildContext(role: UserRole): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 1, email: 'x@beacon.dev', role } }),
    }),
  } as unknown as ExecutionContext;
}

function buildReflector(requiredRoles: UserRole[] | undefined): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows any authenticated role when no @Roles metadata is present', () => {
    const guard = new RolesGuard(buildReflector(undefined));
    expect(guard.canActivate(buildContext('viewer'))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    const guard = new RolesGuard(buildReflector(['admin', 'member']));
    expect(guard.canActivate(buildContext('member'))).toBe(true);
  });

  it('rejects a user whose role is not in the required list', () => {
    const guard = new RolesGuard(buildReflector(['admin']));
    expect(() => guard.canActivate(buildContext('viewer'))).toThrow(
      ForbiddenException,
    );
  });
});
