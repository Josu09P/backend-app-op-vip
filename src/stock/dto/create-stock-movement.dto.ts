// src/stocks/dto/create-stock-movement.dto.ts
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateStockMovementDto {
  @IsEnum(['IN', 'OUT', 'ADJUST'])
  type: 'IN' | 'OUT' | 'ADJUST';

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  reason?: string;

  @IsInt()
  @IsNotEmpty()
  user_id: number;
}
