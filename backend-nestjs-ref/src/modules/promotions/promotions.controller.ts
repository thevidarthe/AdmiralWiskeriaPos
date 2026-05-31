import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promos: PromotionsService) {}

  @Get('active')
  active(@CurrentUser() user: AuthUser) {
    return this.promos.getActiveRules(user.tenantId);
  }

  @Post('calculate')
  calculate(
    @CurrentUser() user: AuthUser,
    @Body() body: { lines: { productId: string; quantity: number; notes?: string }[]; customerId?: string },
  ) {
    return this.promos.calculateLines(user.tenantId, body.lines, body.customerId);
  }

  @Get('coupons/validate')
  validateCoupon(
    @CurrentUser() user: AuthUser,
    @Query('code') code: string,
    @Query('amount') amount: string,
  ) {
    return this.promos.validateCoupon(user.tenantId, code, Number(amount) || 0);
  }
}
