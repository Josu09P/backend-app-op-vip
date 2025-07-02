// src/stocks/stock-movement.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Stock } from './stock.entity';

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST';

@Entity({ name: 'stock_movements' })
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_id' })
  stock: Stock;

  @Column({ type: 'enum', enum: ['IN', 'OUT', 'ADJUST'] })
  type: StockMovementType;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'user_id' })
  user_id: number; // solo el ID, sin relación completa para simplificar

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
