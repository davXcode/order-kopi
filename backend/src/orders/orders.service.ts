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

  async attachProof(id: string, paymentProofUrl: string) {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    order.paymentProofUrl = paymentProofUrl;
    // opsional: auto set paid? biasanya jangan auto, biar admin verifikasi
    return this.repo.save(order);
  }

  async stats() {
    const totalOrders = await this.repo.count();

    const result = await this.repo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalPrice), 0)', 'sum')
      .getRawOne<{ sum: number }>();

    return {
      totalOrders,
      totalRevenue: Number(result?.sum ?? 0),
    };
  }
}
