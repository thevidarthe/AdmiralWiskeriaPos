import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { LoyaltyLevel } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CrmService } from './crm.service';

@ApiTags('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('customers')
  list(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('level') level?: LoyaltyLevel,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.crm.listCustomers(user.tenantId, {
      search,
      level,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    });
  }

  @Get('customers/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.getCustomer(user.tenantId, id);
  }

  @Post('customers')
  upsert(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.crm.upsertCustomer(user.tenantId, body);
  }

  @Put('customers/:id/consent')
  consent(@Param('id') id: string, @Body() body: any) {
    return this.crm.registerConsent(id, body);
  }

  @Post('segments/preview')
  segment(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.crm.getSegmentMembers(user.tenantId, body);
  }
}
