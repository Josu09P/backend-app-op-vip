import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  @IsOptional()
  id_product?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
