import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateCategoriesDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  parent?: number;

  image: string;
}
