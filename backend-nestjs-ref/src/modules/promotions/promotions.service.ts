import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getDay, getHours, getMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface LineInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface CalculatedLine {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  promoApplied: string | null;
  notes?: string;
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveRules(tenantId: string, now: Date = new Date()) {
    const all = await this.prisma.promotionRule.findMany({
      where: { tenantId, active: true },
      include: { products: true },
    });
    const zoned = toZonedTime(now, 'America/Bogota');
    const day = getDay(zoned);
    const currentTime = `${String(getHours(zoned)).padStart(2, '0')}:${String(getMinutes(zoned)).padStart(2, '0')}`;
    return all.filter((rule) => {
      if (rule.type === 'HAPPY_HOUR') {
        if (rule.daysOfWeek?.length && !rule.daysOfWeek.includes(day)) return false;
        if (rule.startTime && currentTime < rule.startTime) return false;
        if (rule.endTime && currentTime > rule.endTime) return false;
      }
      if (rule.startsAt && now < rule.startsAt) return false;
      if (rule.endsAt && now > rule.endsAt) return false;
      return true;
    });
  }

  async calculateLines(
    tenantId: string,
    lines: LineInput[],
    customerId?: string,
    now: Date = new Date(),
  ): Promise<CalculatedLine[]> {
    if (!lines.length) return [];
    const rules = await this.getActiveRules(tenantId, now);
    const customer = customerId
      ? await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } })
      : null;

    const productIds = [...new Set(lines.map((l) => l.productId))];
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return lines.map((line) => {
      const product = productMap.get(line.productId);
      if (!product) throw new NotFoundException(`Producto ${line.productId} no existe`);

      const unitPrice = Number(product.basePrice);
      let discount = 0;
      let promoApplied: string | null = null;

      for (const rule of rules) {
        const applies = rule.products.some((p) => p.productId === line.productId);
        if (!applies) continue;
        if (
          rule.loyaltyLevels?.length &&
          (!customer || !rule.loyaltyLevels.includes(customer.loyaltyLevel))
        ) {
          continue;
        }
        const ruleDiscount =
          rule.type === 'FIXED_DISCOUNT'
            ? Number(rule.discountValue)
            : (Number(rule.discountValue) / 100) * unitPrice;
        if (ruleDiscount > discount) {
          discount = ruleDiscount;
          promoApplied = rule.name;
          if (!rule.stackable) break;
        }
      }

      const unitFinal = Math.max(0, unitPrice - discount);
      const lineTotal = unitFinal * line.quantity;
      return {
        productId: line.productId,
        productName: product.name,
        quantity: line.quantity,
        unitPrice,
        discount: discount * line.quantity,
        taxRate: Number(product.taxRate),
        lineTotal,
        promoApplied,
        notes: line.notes,
      };
    });
  }

  async validateCoupon(tenantId: string, code: string, orderAmount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    if (!coupon || !coupon.active) return { valid: false, message: 'Cupón inválido' };
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
      return { valid: false, message: 'Cupón agotado' };
    if (coupon.expiresAt && new Date() > coupon.expiresAt)
      return { valid: false, message: 'Cupón vencido' };
    if (coupon.startsAt && new Date() < coupon.startsAt)
      return { valid: false, message: 'Cupón aún no activo' };
    const discount =
      coupon.discountType === 'percentage'
        ? (Number(coupon.value) / 100) * orderAmount
        : Number(coupon.value);
    return { valid: true, discount, couponId: coupon.id, code: coupon.code };
  }

  async consumeCoupon(tenantId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });
    if (!coupon) return null;
    return this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
