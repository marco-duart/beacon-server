import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../database/schema';

export class LoginDto {
  @ApiProperty({ example: 'admin@beacon.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'change-me-please' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;
}

export class MeResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: UserRole;
}
