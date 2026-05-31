import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { LoyaltyLevel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const LOYALTY_THRESHOLDS = {
  SILVER: 500_000,
  GOLD: 2_000_000,
  PLATINUM: 5_000_000,
};

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertCustomer(
    tenantId: string,
    dto: { phone: string; name?: string; email?: string; birthday?: Date },
  ) {
    const phone = this.normalizePhone(dto.phone);
    return this.prisma.customer.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: {
        name: dto.name,
        email: dto.email,
        birthday: dto.birthday,
      },
      create: {
        tenantId,
        phone,
        name: dto.name ?? 'Cliente',
        email: dto.email,
        birthday: dto.birthday,
      },
    });
  }

  async getCustomer(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        consents: { where: { active: true } },
        loyaltyTx: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async listCustomers(
    tenantId: string,
    opts?: { search?: string; level?: LoyaltyLevel; page?: number; perPage?: number },
  ) {
    const page = opts?.page ?? 1;
    const perPage = Math.min(opts?.perPage ?? 50, 200);
    const where: any = { tenantId };
    if (opts?.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { phone: { contains: opts.search } },
        { email: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    if (opts?.level) where.loyaltyLevel = opts.level;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: { consents: { where: { active: true } } },
        orderBy: { totalSpent: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
  }

  async registerConsent(
    customerId: string,
    dto: { type: string; channel: string; active: boolean },
  ) {
    await this.prisma.whatsAppConsent.updateMany({
      where: { customerId, type: dto.type, active: true },
      data: { active: false, revokedAt: new Date() },
    });
    if (dto.active) {
      await this.prisma.whatsAppConsent.create({
        data: { customerId, type: dto.type, channel: dto.channel, active: true, termsVersion: 'v1' },
      });
    }
    return { success: true };
  }

  async creditPoints(customerId: string, saleId: string | null, points: number, reason: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return null;

    const newSpent = Number(customer.totalSpent) + points / 0.01;
    let nextLevel: LoyaltyLevel = 'CLASSIC';
    if (newSpent >= LOYALTY_THRESHOLDS.PLATINUM) nextLevel = 'PLATINUM';
    else if (newSpent >= LOYALTY_THRESHOLDS.GOLD) nextLevel = 'GOLD';
    else if (newSpent >= LOYALTY_THRESHOLDS.SILVER) nextLevel = 'SILVER';

    const prevLevel = customer.loyaltyLevel;
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        pointsBalance: { increment: points },
        loyaltyLevel: nextLevel,
        visitCount: saleId ? { increment: 1 } : undefined,
        lastVisitAt: saleId ? new Date() : undefined,
      },
    });

    await this.prisma.loyaltyTransaction.create({
      data: { customerId, saleId, pointsDelta: points, reason },
    });

    return { customer: updated, levelChanged: prevLevel !== nextLevel, prevLevel, nextLevel };
  }

  async getSegmentMembers(
    tenantId: string,
    filter: {
      loyaltyLevels?: LoyaltyLevel[];
      minVisits?: number;
      hasMarketingConsent?: boolean;
      minTotalSpent?: number;
    },
  ) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(filter.loyaltyLevels?.length ? { loyaltyLevel: { in: filter.loyaltyLevels } } : {}),
        ...(filter.minVisits ? { visitCount: { gte: filter.minVisits } } : {}),
        ...(filter.minTotalSpent ? { totalSpent: { gte: filter.minTotalSpent } } : {}),
        ...(filter.hasMarketingConsent
          ? { consents: { some: { type: 'marketing', active: true } } }
          : {}),
      },
      select: { id: true, name: true, phone: true, loyaltyLevel: true, visitCount: true, totalSpent: true },
    });
  }

  @OnEvent('sale.closed')
  async onSaleClosed(payload: { tenantId: string; sale: any; amount: number }) {
    const { sale, amount } = payload;
    if (!sale.customerId) return;
    const points = Math.floor(Number(amount) * 0.01);
    if (points > 0) {
      await this.creditPoints(sale.customerId, sale.id, points, 'Compra en Admiral');
    }
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('57')) return `+${digits}`;
    if (digits.length === 10) return `+57${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }
}
