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

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  // simpan URL bukti pembayaran (Cloudinary secure_url)
  @Column({ type: 'text', nullable: true })
  paymentProofUrl: string | null;

  // simpan Cloudinary public_id (buat delete/replace)
  @Column({ type: 'text', nullable: true })
  paymentProofPublicId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
