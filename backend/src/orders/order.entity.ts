import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type CoffeeType = 'americano' | 'latte';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  customerName: string;

  @Column({ type: 'text' })
  item: CoffeeType;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'integer' })
  unitPrice: number;

  @Column({ type: 'integer' })
  totalPrice: number;

  // NEW
  @Column({ type: 'boolean', default: false })
  paid: boolean;

  // NEW: simpan URL/path bukti pembayaran
  @Column({ type: 'text', nullable: true })
  paymentProofUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
