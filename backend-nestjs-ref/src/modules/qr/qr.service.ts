import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async generateForTable(tenantId: string, branchId: string, tableId: string, baseUrl: string) {
    // Desactivar QR previos de la mesa
    await this.prisma.qrCode.updateMany({
      where: { tenantId, branchId, tableId, active: true },
      data: { active: false },
    });

    const created = await this.prisma.qrCode.create({
      data: { tenantId, branchId, tableId },
    });

    const url = `${baseUrl.replace(/\/$/, '')}/qr/${created.token}`;
    const svgData = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 1 });

    const updated = await this.prisma.qrCode.update({
      where: { id: created.id },
      data: { svgData },
    });

    return { ...updated, url };
  }

  async listForBranch(tenantId: string, branchId: string) {
    return this.prisma.qrCode.findMany({
      where: { tenantId, branchId, active: true },
      include: { table: { include: { zone: true } } },
    });
  }

  // Endpoint público: resolver QR para mostrar el menú al cliente
  async resolveToken(token: string) {
    const qr = await this.prisma.qrCode.findUnique({
      where: { token },
      include: { table: { include: { zone: true } } },
    });
    if (!qr || !qr.active) throw new NotFoundException('QR inválido');
    if (qr.expiresAt && qr.expiresAt < new Date()) {
      throw new NotFoundException('QR expirado');
    }
    return {
      table: { id: qr.table.id, number: qr.table.number },
      zone: { name: qr.table.zone.name, type: qr.table.zone.type },
      branchId: qr.branchId,
      tenantId: qr.tenantId,
    };
  }

  async callWaiter(token: string) {
    const qr = await this.prisma.qrCode.findUnique({
      where: { token },
      include: { table: true },
    });
    if (!qr) throw new NotFoundException('QR inválido');

    this.events.emit('qr.waiterCalled', {
      tenantId: qr.tenantId,
      branchId: qr.branchId,
      tableId: qr.tableId,
      tableNumber: qr.table.number,
    });
    return { ok: true, message: 'Mesero notificado' };
  }
}
