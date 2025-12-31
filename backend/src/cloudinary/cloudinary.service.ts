import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

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
    opts?: {
      folder?: string;
      publicId?: string;
    },
  ): Promise<{
    secureUrl: string;
    publicId: string;
  }> {
    try {
      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: opts?.folder ?? 'kopi-order/proofs',
            public_id: opts?.publicId,
            resource_type: 'image',
          },
          (err, result: UploadApiResponse | undefined) => {
            if (err || !result) {
              // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
              reject(err);
              return;
            }

            resolve({
              secureUrl: result.secure_url,
              publicId: result.public_id,
            });
          },
        );

        stream.end(buffer);
      });
    } catch {
      throw new InternalServerErrorException('Gagal upload bukti pembayaran');
    }
  }
}
