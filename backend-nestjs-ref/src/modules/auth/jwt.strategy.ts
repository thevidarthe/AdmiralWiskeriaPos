import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  tenantId: string;
  tenantSlug: string;
  role: AuthUser['role'];
  name: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, active: true, tenantId: true, role: true, name: true, email: true },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException('Sesión inválida o usuario deshabilitado');
    }
    return {
      userId: user.id,
      tenantId: user.tenantId,
      tenantSlug: payload.tenantSlug,
      role: user.role,
      name: user.name,
      email: user.email,
    };
  }
}
