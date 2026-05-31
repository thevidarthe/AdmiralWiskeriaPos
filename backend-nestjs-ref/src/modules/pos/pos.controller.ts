import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PosService } from './pos.service';
import { AddItemsDto, ClosePaymentDto, OpenSaleDto } from './dto/pos.dto';

@ApiTags('pos')
@Controller('pos')
@Roles('ADMIN', 'MANAGER', 'BARISTA', 'WAITER', 'CASHIER')
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('sales')
  listOpen(@CurrentUser() user: AuthUser, @Query('branchId') branchId: string) {
    return this.pos.listOpenSales(user.tenantId, branchId);
  }

  @Get('sales/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pos.getSale(user.tenantId, id);
  }

  @Post('sales')
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenSaleDto) {
    return this.pos.openSale(user.tenantId, user.userId, dto);
  }

  @Post('sales/:id/items')
  addItems(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddItemsDto) {
    return this.pos.addItems(user.tenantId, id, user.userId, dto);
  }

  @Delete('sales/:id/items/:itemId')
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.pos.removeItem(user.tenantId, id, itemId);
  }

  @Post('sales/:id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ClosePaymentDto) {
    return this.pos.closeSale(user.tenantId, id, user.userId, dto);
  }

  @Post('sales/:id/cancel')
  @Roles('ADMIN', 'MANAGER')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.pos.cancelSale(user.tenantId, id, user.userId, body?.reason);
  }
}
