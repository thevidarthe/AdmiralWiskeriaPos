import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma, SaleSource } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import {
  AddItemsDto,
  ClosePaymentDto,
  OpenSaleDto,
} from './dto/pos.dto';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promotions: PromotionsService,
    private readonly events: EventEmitter2,
  ) {}

  async openSale(tenantId: string, userId: string, dto: OpenSaleDto) {
    if (dto.tableId) {
      const existing = await this.prisma.sale.findFirst({
        where: {
          tenantId,
          tableId: dto.tableId,
          status: { in: ['OPEN', 'PENDING_PAYMENT'] },
        },
      });
      if (existing) {
        throw new ConflictException({
          message: 'La mesa ya tiene una venta abierta',
          saleId: existing.id,
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          tenantId,
          branchId: dto.branchId,
          tableId: dto.tableId,
          shiftId: dto.shiftId,
          customerId: dto.customerId,
          userId,
          name: dto.name ?? (dto.tableId ? null : 'Para llevar'),
          source: dto.source ?? 'POS',
        },
        include: { table: true, customer: true },
      });

      if (dto.tableId) {
        await tx.table.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }
      return sale;
    });
  }

  async getSale(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        items: true,
        payments: true,
        customer: true,
        table: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async listOpenSales(tenantId: string, branchId: string) {
    return this.prisma.sale.findMany({
      where: {
        tenantId,
        branchId,
        status: { in: ['OPEN', 'PENDING_PAYMENT'] },
      },
      include: {
        items: { select: { quantity: true, lineTotal: true, productName: true } },
        customer: { select: { id: true, name: true, loyaltyLevel: true } },
        table: { select: { id: true, number: true, zone: { select: { name: true, type: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { openedAt: 'asc' },
    });
  }

  async addItems(tenantId: string, saleId: string, userId: string, dto: AddItemsDto) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'OPEN') throw new BadRequestException('La venta no está abierta');

    const calculated = await this.promotions.calculateLines(
      tenantId,
      dto.lines,
      dto.customerId ?? sale.customerId ?? undefined,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const items = await Promise.all(
        calculated.map((line) =>
          tx.saleItem.create({
            data: {
              tenantId,
              saleId,
              productId: line.productId,
              productName: line.productName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
              promoApplied: line.promoApplied,
              notes: line.notes,
            },
          }),
        ),
      );

      const totals = await this.recalcTotals(tx, saleId);
      const updated = await tx.sale.update({
        where: { id: saleId },
        data: totals,
        include: { items: true, customer: true, table: true },
      });

      return { items, sale: updated };
    });

    this.events.emit('sale.itemsAdded', { tenantId, sale: result.sale, addedBy: userId });
    return result;
  }

  async removeItem(tenantId: string, saleId: string, itemId: string) {
    const item = await this.prisma.saleItem.findFirst({
      where: { id: itemId, saleId, tenantId },
    });
    if (!item) throw new NotFoundException('Item no encontrado');

    return this.prisma.$transaction(async (tx) => {
      await tx.saleItem.delete({ where: { id: itemId } });
      const totals = await this.recalcTotals(tx, saleId);
      return tx.sale.update({
        where: { id: saleId },
        data: totals,
        include: { items: true },
      });
    });
  }

  async closeSale(tenantId: string, saleId: string, userId: string, dto: ClosePaymentDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true, customer: true, table: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status === 'PAID') throw new BadRequestException('Venta ya cobrada');
    if (sale.status === 'CANCELLED') throw new BadRequestException('Venta cancelada');
    if (!sale.items.length) throw new BadRequestException('No hay items para cobrar');

    let couponDiscount = 0;
    if (dto.couponCode) {
      const c = await this.promotions.validateCoupon(tenantId, dto.couponCode, Number(sale.subtotal));
      if (!c.valid) throw new BadRequestException(c.message);
      couponDiscount = c.discount ?? 0;
    }

    const subtotal = Number(sale.subtotal);
    const discountTotal = Number(sale.discountTotal) + couponDiscount;
    const taxBase = Math.max(0, subtotal - couponDiscount);
    const taxTotal = this.computeTaxTotal(sale.items, couponDiscount, subtotal);
    const tipAmount = dto.tipAmount ?? 0;
    const grandTotal = taxBase + tipAmount;

    const totalPaid = dto.payments.reduce((s, p) => s + Number(p.amount), 0);
    if (Math.abs(totalPaid - grandTotal) > 1) {
      throw new BadRequestException(
        `Total pagado (${totalPaid}) no coincide con total a cobrar (${grandTotal})`,
      );
    }

    const closed = await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.payments.map((p) =>
          tx.payment.create({
            data: {
              tenantId,
              saleId,
              method: p.method,
              amount: p.amount,
              reference: p.reference,
              status: 'COMPLETED',
            },
          }),
        ),
      );

      if (dto.couponCode) {
        await this.promotions.consumeCoupon(tenantId, dto.couponCode);
      }

      const finalSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'PAID',
          closedAt: new Date(),
          discountTotal,
          taxTotal,
          tipAmount,
          grandTotal,
        },
        include: { items: true, customer: true, table: true, payments: true },
      });

      if (sale.tableId) {
        await tx.table.update({ where: { id: sale.tableId }, data: { status: 'FREE' } });
      }

      // Descontar inventario
      const itemsToTrack = sale.items;
      for (const item of itemsToTrack) {
        const stock = await tx.stockItem.findUnique({
          where: { branchId_productId: { branchId: sale.branchId, productId: item.productId } },
        });
        if (!stock) continue;
        await tx.stockItem.update({
          where: { branchId_productId: { branchId: sale.branchId, productId: item.productId } },
          data: { quantity: { decrement: Number(item.quantity) } },
        });
        await tx.inventoryMovement.create({
          data: {
            tenantId,
            branchId: sale.branchId,
            productId: item.productId,
            movementType: 'OUT_SALE',
            quantity: Number(item.quantity),
            referenceType: 'sale',
            referenceId: saleId,
            createdBy: userId,
          },
        });
      }

      return finalSale;
    });

    this.events.emit('sale.closed', {
      tenantId,
      sale: closed,
      amount: grandTotal,
      userId,
    });

    this.logger.log(`💰 Venta ${saleId} cerrada por ${grandTotal}`);
    return closed;
  }

  async cancelSale(tenantId: string, saleId: string, userId: string, reason?: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) throw new NotFoundException();
    if (sale.status === 'PAID') throw new BadRequestException('No se puede cancelar una venta ya cobrada');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id: saleId },
        data: { status: 'CANCELLED', closedAt: new Date(), notes: reason },
      });
      if (sale.tableId) {
        await tx.table.update({ where: { id: sale.tableId }, data: { status: 'FREE' } });
      }
      this.events.emit('sale.cancelled', { tenantId, sale: updated, userId, reason });
      return updated;
    });
  }

  private async recalcTotals(tx: Prisma.TransactionClient, saleId: string) {
    const items = await tx.saleItem.findMany({ where: { saleId } });
    const subtotal = items.reduce((s, i) => s + Number(i.lineTotal), 0);
    const discountTotal = items.reduce((s, i) => s + Number(i.discount), 0);
    const taxTotal = items.reduce(
      (s, i) => s + Number(i.lineTotal) * (Number(i.taxRate) / (1 + Number(i.taxRate))),
      0,
    );
    const grandTotal = subtotal;
    return { subtotal, discountTotal, taxTotal, grandTotal };
  }

  private computeTaxTotal(items: { lineTotal: any; taxRate: any }[], couponDiscount: number, subtotal: number) {
    if (!subtotal) return 0;
    const ratio = (subtotal - couponDiscount) / subtotal;
    return items.reduce(
      (s, i) => s + Number(i.lineTotal) * ratio * (Number(i.taxRate) / (1 + Number(i.taxRate))),
      0,
    );
  }
}
