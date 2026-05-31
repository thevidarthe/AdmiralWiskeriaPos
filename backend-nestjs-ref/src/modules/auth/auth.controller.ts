import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ChangePinDto, LoginPasswordDto, LoginPinDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginPasswordDto) {
    return this.auth.loginWithPassword(dto.tenantSlug, dto.email, dto.password);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('pin')
  @HttpCode(HttpStatus.OK)
  loginPin(@Body() dto: LoginPinDto) {
    return this.auth.loginWithPin(dto.tenantSlug, dto.userId, dto.pin);
  }

  @Public()
  @Get('users/:tenantSlug')
  listForRoleSelection(@Param('tenantSlug') tenantSlug: string) {
    return this.auth.listLoginableUsers(tenantSlug);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Put('me/password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Put('me/pin')
  changePin(@CurrentUser() user: AuthUser, @Body() dto: ChangePinDto) {
    return this.auth.changePin(user.userId, dto.currentPassword, dto.newPin);
  }
}
