import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../database/schema';

export class CreateUserDto {
  @ApiProperty({ example: 'oncall@beacon.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: USER_ROLES, default: 'member' })
  @IsIn(USER_ROLES)
  role!: UserRole;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: USER_ROLES })
  @IsIn(USER_ROLES)
  role!: UserRole;
}

export class UserResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;

  @ApiProperty()
  createdAt!: Date;
}

export class UserCredentialsResponseDto extends UserResponseDto {
  @ApiProperty({
    description:
      'Plaintext temporary password — shown only once, share it securely',
  })
  temporaryPassword!: string;
}
