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
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { extname } from 'path';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { UpdatePaidDto } from './update-paid.dto';

// Type-safe filename generator (no any)
function fileName(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, filename: string) => void,
) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

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
  constructor(private readonly service: OrdersService) {}

  @Post('orders')
  create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  // GET /orders?sort=asc|desc&paid=all|paid|unpaid
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
      storage: diskStorage({
        destination: './uploads',
        filename: fileName,
      }),
      fileFilter: imageOnlyFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadProof(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException(
        'Upload bukti pembayaran wajib berupa gambar (jpg/png) max 5MB',
      );

    const url = `/uploads/${file.filename}`;
    return this.service.attachProof(id, url);
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
