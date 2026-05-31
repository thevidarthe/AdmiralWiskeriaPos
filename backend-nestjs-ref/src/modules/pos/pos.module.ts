import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [PromotionsModule],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
