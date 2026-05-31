import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutos

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async loginWithPassword(tenantSlug: string, email: string, password: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.active) {
      throw new UnauthorizedException('Tenant inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    });

    // Mensaje genérico para no filtrar si el usuario existe
    if (!user || !user.active) throw new UnauthorizedException('Credenciales inválidas');

    this.assertNotLocked(user);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.registerSuccess(user.id);
    return this.signToken(user, tenant.slug);
  }

  async loginWithPin(tenantSlug: string, userId: string, pin: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.active) throw new UnauthorizedException('Tenant inválido');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active || user.tenantId !== tenant.id) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.assertNotLocked(user);

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('PIN incorrecto');
    }

    await this.registerSuccess(user.id);
    return this.signToken(user, tenant.slug);
  }

  async listLoginableUsers(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return [];
    return this.prisma.user.findMany({
      where: { tenantId: tenant.id, active: true },
      select: { id: true, name: true, role: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new BadRequestException('Contraseña actual incorrecta');
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(next, 12) },
    });
  }

  async changePin(userId: string, currentPassword: string, newPin: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Contraseña actual incorrecta');
    return this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: await bcrypt.hash(newPin, 12), failedAttempts: 0, lockedUntil: null },
    });
  }

  private assertNotLocked(user: User) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(`Cuenta bloqueada por ${minutes} minuto(s) por intentos fallidos`);
    }
  }

  private async registerFailedAttempt(user: User) {
    const next = user.failedAttempts + 1;
    const shouldLock = next >= MAX_FAILED_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: next,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    if (shouldLock) {
      this.logger.warn(`🔒 Usuario bloqueado por intentos fallidos: ${user.email}`);
    }
  }

  private async registerSuccess(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  }

  private signToken(user: User, tenantSlug: string) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      tenantSlug,
      role: user.role,
      name: user.name,
      email: user.email,
    };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
