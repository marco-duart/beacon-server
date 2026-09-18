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
import { generateTempPassword } from '../../common/password.util';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateUserDto,
  UpdateUserRoleDto,
  UserCredentialsResponseDto,
  UserResponseDto,
} from './users.dto';
import { toUserCredentialsResponse, toUserResponse } from './users.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List dashboard users (admin only)' })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(toUserResponse);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a dashboard user with an auto-generated temporary password',
  })
  async create(
    @Body() dto: CreateUserDto,
  ): Promise<UserCredentialsResponseDto> {
    const plainPassword = generateTempPassword();
    const user = await this.usersService.create(
      dto.email,
      plainPassword,
      dto.role,
    );
    void this.notificationsService.notifyUserCredentials(
      user,
      plainPassword,
      'created',
    );
    return toUserCredentialsResponse(user, plainPassword);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Change a user's role" })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actingUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateRole(
      id,
      dto.role,
      actingUser.id,
    );
    return toUserResponse(user);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Issue a new temporary password for a user' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserCredentialsResponseDto> {
    const { user, plainPassword } = await this.usersService.resetPassword(id);
    void this.notificationsService.notifyUserCredentials(
      user,
      plainPassword,
      'password-reset',
    );
    return toUserCredentialsResponse(user, plainPassword);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actingUser: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.usersService.remove(id, actingUser.id);
    return { success: true };
  }
}
