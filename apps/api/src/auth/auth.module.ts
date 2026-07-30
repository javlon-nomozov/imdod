import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeviceGuard } from './guards/device.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  // Standart sir/TTL yo'q — access va refresh har chaqiruvda o'z
  // sirini aniq beradi (bitta JwtService ikkalasini ham xizmat qiladi).
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, DeviceGuard, JwtAuthGuard, RolesGuard],
  // `JwtModule` ham eksport qilinadi: aks holda `JwtAuthGuard`ni
  // `@UseGuards()` orqali ishlatgan BOSHQA modullar (masalan
  // `CatalogModule`) o'z kontekstida `JwtService`ni topa olmaydi.
  exports: [JwtModule, AuthService, DeviceGuard, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
