import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, icon: true, color: true, sortOrder: true },
    });
  }

  async getProducts(tenantId: string, opts?: { categorySlug?: string; branchId?: string }) {
    const where: any = { tenantId, available: true };
    if (opts?.categorySlug) where.category = { slug: opts.categorySlug };

    const products = await this.prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true, icon: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    if (!opts?.branchId) return products;

    // Adjuntar stock si se pidió de una sucursal
    const stocks = await this.prisma.stockItem.findMany({
      where: { branchId: opts.branchId, productId: { in: products.map((p) => p.id) } },
    });
    const stockMap = new Map(stocks.map((s) => [s.productId, Number(s.quantity)]));
    return products.map((p) => ({ ...p, stockQuantity: stockMap.get(p.id) ?? 0 }));
  }
}
