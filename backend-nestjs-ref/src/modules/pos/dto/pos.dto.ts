import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, SaleSource } from '@prisma/client';

export class OpenSaleDto {
  @IsString() branchId!: string;
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsString() shiftId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(SaleSource) source?: SaleSource;
}

export class OrderLineInput {
  @IsString() productId!: string;
  @IsNumber() @Min(1) quantity!: number;
  @IsOptional() @IsString() notes?: string;
}

export class AddItemsDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderLineInput)
  lines!: OrderLineInput[];
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsEnum(SaleSource) source?: SaleSource;
}

export class PaymentInput {
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() reference?: string;
}

export class ClosePaymentDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PaymentInput)
  payments!: PaymentInput[];
  @IsOptional() @IsNumber() @Min(0) tipAmount?: number;
  @IsOptional() @IsString() couponCode?: string;
}
