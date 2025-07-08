import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import * as multer from 'multer';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  getMulterUploader(folder: string) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: () => ({
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
      }),
    });

    return multer({ storage });
  }

  async uploadImage(file: Express.Multer.File, folder = 'ticket-er') {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      transformation: [
        { width: 1000, crop: 'scale' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    return result.secure_url;
  }
}
