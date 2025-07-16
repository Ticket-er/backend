import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
