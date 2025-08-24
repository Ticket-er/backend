import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'ticketer',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { width: 1000, crop: 'scale' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
          }
          if (!result || !result.secure_url) {
            return reject(
              new InternalServerErrorException(
                'Cloudinary upload failed: No secure_url returned.',
              ),
            );
          }
          resolve(result.secure_url);
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  async uploadBuffer(buffer: Buffer, folder = 'ticketer'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1000, crop: 'scale' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
          }
          if (!result?.secure_url) {
            return reject(
              new InternalServerErrorException(
                'Cloudinary upload failed: No secure_url returned.',
              ),
            );
          }
          resolve(result.secure_url);
        },
      );

      // Pipe your raw buffer into Cloudinary
      const stream = Readable.from(buffer);
      stream.pipe(uploadStream);
    });
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from the image URL (including folder path)
      const parts = imageUrl.split('/');
      const publicId = parts
        .slice(parts.indexOf('ticketer')) // start from folder name
        .join('/')
        .replace(/\.[^/.]+$/, ''); // remove extension

      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Cloudinary deletion failed: ${error.message}`,
      );
    }
  }
}
