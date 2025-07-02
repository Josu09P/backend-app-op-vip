import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateStockDto {
  @IsInt()
  @IsNotEmpty()
  id_product: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  quantity: number;
}
