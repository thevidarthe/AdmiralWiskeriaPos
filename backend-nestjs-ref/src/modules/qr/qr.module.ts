import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';

@Module({
  imports: [MenuModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
