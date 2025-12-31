import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, CoffeeType } from './order.entity';

const PRICE: Record<CoffeeType, number> = {
  americano: 15000,
  latte: 18000,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async create(dto: CreateOrderDto) {
    const name = dto.customerName?.trim();
    if (!name) throw new BadRequestException('Nama wajib diisi');

    const unitPrice = PRICE[dto.item];
    const totalPrice = unitPrice * dto.quantity;

    const order = this.repo.create({
      customerName: name,
      item: dto.item,
      quantity: dto.quantity,
      unitPrice,
      totalPrice,
      paid: false,
      paymentProofUrl: null,
      // kalau kamu nanti tambah kolom ini, aman:
      // paymentProofPublicId: null,
    });

    return this.repo.save(order);
  }

  // paidFilter: 'all' | 'paid' | 'unpaid'
  async findAll(
    sort: 'asc' | 'desc',
    paid: 'all' | 'paid' | 'unpaid',
    date?: string,
  ) {
    const qb = this.repo.createQueryBuilder('o');

    if (paid === 'paid') qb.andWhere('o.paid = :paid', { paid: true });
    if (paid === 'unpaid') qb.andWhere('o.paid = :paid', { paid: false });

    // NOTE: untuk Postgres nanti sebaiknya pakai DATE(o.createdAt) atau CAST.
    // Ini masih jalan di SQLite, dan umumnya juga aman di PG dengan CAST, tapi nanti bisa kita rapihin.
    if (date) {
      qb.andWhere('DATE(o.createdAt) = DATE(:date)', { date });
    }

    qb.orderBy('o.createdAt', sort.toUpperCase() as 'ASC' | 'DESC');

    return qb.getMany();
  }

  async updatePaid(id: string, paid: boolean) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    order.paid = paid;
    return this.repo.save(order);
  }

  /**
   * Simpan bukti pembayaran.
   * - paymentProofUrl: secure_url dari Cloudinary
   * - paymentProofPublicId: public_id dari Cloudinary (opsional, buat delete/replace)
   */
  async attachProof(id: string, paymentProofUrl: string) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    order.paymentProofUrl = paymentProofUrl;
    return this.repo.save(order);
  }

  // async attachProof(
  //   id: string,
  //   paymentProofUrl: string,
  //   paymentProofPublicId?: string,
  // ) {
  //   const order = await this.repo.findOne({ where: { id } });
  //   if (!order) throw new NotFoundException('Order tidak ditemukan');

  //   order.paymentProofUrl = paymentProofUrl;

  //   // Kalau entity kamu BELUM punya kolom ini, biarin comment.
  //   // Kalau sudah kamu tambah, tinggal uncomment.
  //   // (order as any).paymentProofPublicId = paymentProofPublicId ?? null;

  //   // opsional: jangan auto paid, biar admin verifikasi manual
  //   return this.repo.save(order);
  // }

  async stats() {
    const totalOrders = await this.repo.count();

    const result = await this.repo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalPrice), 0)', 'sum')
      .getRawOne<{ sum: string | number }>();

    return {
      totalOrders,
      totalRevenue: Number(result?.sum ?? 0),
    };
  }
}
