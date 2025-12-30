import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImageBuffer(
    buffer: Buffer,
    opts?: { folder?: string; publicId?: string },
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: opts?.folder ?? 'kopi-order/proofs',
          public_id: opts?.publicId,
          resource_type: 'image',
        },
        (err, result) => {
          if (err || !result) {
            reject(
              new InternalServerErrorException('Gagal upload bukti pembayaran'),
            );
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );

      upload.end(buffer);
    });
  }
}
