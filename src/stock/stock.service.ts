import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stock } from './stock.entity';
import { Repository } from 'typeorm';
import { CreateStockDto } from './dto/create-stock.dto';
import { StockResponseDto } from './dto/response-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockMovement, StockMovementType } from './stock-movement.entity';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private stockRepo: Repository<Stock>,
    @InjectRepository(StockMovement)
    private stockMovementRepo: Repository<StockMovement>
  ) {}

  async findAll() {
    return await this.stockRepo.find({
      relations: ['product'],
    });
  }

  async getStockById(id: number): Promise<StockResponseDto> {
    const stock = await this.stockRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!stock) throw new NotFoundException('Stock no encontrado');
    return this.toResponseDto(stock);
  }

  async create(createStockDto: CreateStockDto): Promise<StockResponseDto> {
    const exists = await this.stockRepo.findOneBy({ id_product: createStockDto.id_product });
    if (exists) throw new BadRequestException('Este producto ya tiene un stock registrado');
    const newStock = this.stockRepo.create(createStockDto);
    const savedStock = await this.stockRepo.save(newStock);
    return this.toResponseDto(savedStock);
  }

  private async saveStockMovement(
    stock: Stock,
    data: {
      type: StockMovementType;
      quantity: number;
      reason?: string;
      user_id: number;
    }
  ) {
    const movement = this.stockMovementRepo.create({
      stock,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason || '',
      user_id: data.user_id,
    });
    await this.stockMovementRepo.save(movement);
  }

  async updateQuantity(
    id_product: number,
    updateStockDto: UpdateStockDto & { user_id: number },
  ): Promise<StockResponseDto> {
    const stock = await this.stockRepo.findOne({
      where: { id_product },
      relations: ['product'],
    });
  
    if (!stock) throw new NotFoundException('Stock no encontrado');
    if (updateStockDto.quantity === undefined)
      throw new NotFoundException('Debe proporcionar la cantidad');
  
    const oldQty = stock.quantity;
    const newQty = updateStockDto.quantity;
    const diff = newQty - oldQty;
  
    stock.quantity = newQty;
    stock.updated_at = new Date();
  
    const updatedStock = await this.stockRepo.save(stock);
  
    await this.saveStockMovement(stock, {
      type: diff > 0 ? 'IN' : diff < 0 ? 'OUT' : 'ADJUST',
      quantity: Math.abs(diff),
      reason: 'Actualización manual de stock',
      user_id: updateStockDto.user_id,
    });
  
    return this.toResponseDto(updatedStock);
  }

  async getMovementsByProduct(id_product: number) {
    const stock = await this.stockRepo.findOneBy({ id_product });
    if (!stock) throw new NotFoundException('Stock no encontrado');

    return this.stockMovementRepo.find({
      where: { stock: { id: stock.id } },
      order: { created_at: 'DESC' },
    });
  }
  async getStockByProduct(id_product: number): Promise<StockResponseDto> {
    const stock = await this.stockRepo.findOne({
      where: { id_product },
      relations: ['product'],
    });
    if (!stock) throw new NotFoundException('Stock no encontrado');
    return this.toResponseDto(stock);
  }

  async deleteByProduct(id_product: number): Promise<void> {
    const stock = await this.stockRepo.findOneBy({ id_product });
    if (!stock) throw new NotFoundException('Stock no encontrado');
    await this.stockMovementRepo.delete({ stock: { id: stock.id } });
    await this.stockRepo.delete({ id_product });
  }
  private toResponseDto(stock: Stock): StockResponseDto {
    return {
      id: stock.id,
      id_product: stock.id_product,
      quantity: stock.quantity,
      created_at: stock.created_at,
      updated_at: stock.updated_at,
      product: stock.product
        ? {
            id: stock.product.id,
            name: stock.product.name,
          }
        : undefined,
    };
  }
}
