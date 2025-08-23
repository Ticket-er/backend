import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();

    // Extend Prisma with Accelerate
    Object.assign(this, this.$extends(withAccelerate()));
  }
}
