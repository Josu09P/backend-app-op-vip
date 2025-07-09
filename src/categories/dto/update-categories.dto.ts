import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateCategoriesDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  parent?: number;

  @IsOptional()
  @IsString()
  image?: string;
}
