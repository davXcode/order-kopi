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

// Type-safe image filter
function imageOnlyFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) {
  if (!file.mimetype.startsWith('image/')) return cb(null, false);
  cb(null, true);
}

@Controller()
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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
    return this.service.findAll(sort ?? 'desc', paid ?? 'all', date);
  }

  // Upload proof: multipart/form-data field = "file"
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
      // biar enak tracking & unique
      publicId: `order-${id}-${Date.now()}`,
    });

    // Simpan ke DB (url + publicId kalau kamu simpan fieldnya)
    // Kalau entity kamu belum punya paymentProofPublicId, cukup kirim url saja.
    return this.service.attachProof(id, uploaded.secureUrl);

    // return this.service.attachProof(id, uploaded.secureUrl, uploaded.publicId);
  }

  // Admin toggle paid
  @Patch('orders/:id/paid')
  updatePaid(@Param('id') id: string, @Body() dto: UpdatePaidDto) {
    return this.service.updatePaid(id, dto.paid);
  }

  // stats (route rahasia)
  @Get('dav-order/stats')
  stats() {
    return this.service.stats();
  }
}
