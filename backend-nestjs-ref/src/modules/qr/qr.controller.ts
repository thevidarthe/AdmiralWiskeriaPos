import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { QrService } from './qr.service';
import { MenuService } from '../menu/menu.service';

@ApiTags('qr')
@Controller('qr')
export class QrController {
  constructor(
    private readonly qr: QrService,
    private readonly menu: MenuService,
  ) {}

  // ─── Administrativos ───
  @Roles('ADMIN', 'MANAGER')
  @Post('codes')
  generate(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body() body: { branchId: string; tableId: string },
  ) {
    const base = `${req.protocol}://${req.get('host')}`;
    return this.qr.generateForTable(user.tenantId, body.branchId, body.tableId, base);
  }

  @Get('codes')
  list(@CurrentUser() user: AuthUser, @Query('branchId') branchId: string) {
    return this.qr.listForBranch(user.tenantId, branchId);
  }

  // ─── Endpoints públicos (sin auth) ───
  @Public()
  @Get('resolve/:token')
  resolve(@Param('token') token: string) {
    return this.qr.resolveToken(token);
  }

  @Public()
  @Get('menu/:token')
  async menuByToken(@Param('token') token: string) {
    const ctx = await this.qr.resolveToken(token);
    const [categories, products] = await Promise.all([
      this.menu.getCategories(ctx.tenantId),
      this.menu.getProducts(ctx.tenantId),
    ]);
    return { ...ctx, categories, products };
  }

  @Public()
  @Post('call-waiter/:token')
  callWaiter(@Param('token') token: string) {
    return this.qr.callWaiter(token);
  }
}
