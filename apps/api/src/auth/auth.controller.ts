import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentDevice } from './decorators/current-device.decorator';
import { Roles } from './decorators/roles.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { PosLoginDto } from './dto/pos-login.dto';
import { ProvisionDeviceDto } from './dto/provision-device.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { DeviceGuard } from './guards/device.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { DeviceContext, TokenPair } from './types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(DeviceGuard)
  @Post('pos/login')
  posLogin(@Body() dto: PosLoginDto, @CurrentDevice() device: DeviceContext): Promise<TokenPair> {
    return this.auth.posLogin(device.id, device.registerId, dto.pin);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: AdminLoginDto): Promise<TokenPair> {
    return this.auth.adminLogin(dto.phone, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('devices')
  provisionDevice(
    @Body() dto: ProvisionDeviceDto,
  ): Promise<{ registerId: string; deviceId: string; rawToken: string }> {
    return this.auth.provisionDevice(dto.registerCode, dto.registerName, dto.deviceName);
  }
}
