import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get('categories')
  categories(@CurrentUser() user: AuthUser) {
    return this.menu.getCategories(user.tenantId);
  }

  @Get('products')
  products(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.menu.getProducts(user.tenantId, { categorySlug: category, branchId });
  }
}
