import type { User } from '../../database/schema';
import type { UserCredentialsResponseDto, UserResponseDto } from './users.dto';

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function toUserCredentialsResponse(
  user: User,
  temporaryPassword: string,
): UserCredentialsResponseDto {
  return { ...toUserResponse(user), temporaryPassword };
}
