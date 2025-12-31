/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { UpdatePaidDto } from './update-paid.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

// Image-only filter
function imageOnlyFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(null, false);
  }
  cb(null, true);
}

@Controller()
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // Create order
  @Post('orders')
  create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  // GET /orders?sort=asc|desc&paid=all|paid|unpaid&date=YYYY-MM-DD
  @Get('orders')
  findAll(
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('paid') paid?: 'all' | 'paid' | 'unpaid',
    @Query('date') date?: string,
  ) {
    console.log('ORDERS HIT');
    return this.service.findAll(sort ?? 'desc', paid ?? 'all', date);
  }

  // @Get('orders')
  // findAll(
  //   @Query('sort') sort?: 'asc' | 'desc',
  //   @Query('paid') paid?: 'all' | 'paid' | 'unpaid',
  //   @Query('date') date?: string,
  // ) {
  //   return this.service.findAll(sort ?? 'desc', paid ?? 'all', date);
  // }

  // Upload bukti pembayaran (Cloudinary)
  @Post('orders/:id/proof')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageOnlyFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadProof(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Upload bukti pembayaran wajib berupa gambar (jpg/png) max 5MB',
      );
    }

    // Upload ke Cloudinary
    const uploaded = await this.cloudinary.uploadImageBuffer(file.buffer, {
      folder: 'kopi-order/proofs',
      publicId: `order-${id}-${Date.now()}`,
    });

    // Simpan URL Cloudinary ke database
    // return this.service.attachProof(id, uploaded.url);
    return this.service.attachProof(id, uploaded.secureUrl);
  }

  // Admin toggle paid
  @Patch('orders/:id/paid')
  updatePaid(@Param('id') id: string, @Body() dto: UpdatePaidDto) {
    return this.service.updatePaid(id, dto.paid);
  }

  // Statistik (admin)
  @Get('dav-order/stats')
  stats() {
    return this.service.stats();
  }
}
