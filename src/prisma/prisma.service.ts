import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'; // Adjust the import path based on your project structure

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
  }
}
