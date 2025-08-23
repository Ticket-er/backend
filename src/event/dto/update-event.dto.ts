/* eslint-disable prettier/prettier */
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventCategory } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

class UpdateTicketCategoryDto {
  @IsOptional()
  @IsString()
  id?: string; // To identify existing categories

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxTickets?: number;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description can not exceed 500 words (approx 2500 characters).',
  })
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTicketCategoryDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          throw new BadRequestException('ticketCategories must be an array');
        }
        return parsed;
      } catch (error) {
        throw new BadRequestException(`Invalid ticketCategories JSON: ${error.message}`);
      }
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (value == null) {
      return undefined;
    }
    throw new BadRequestException('ticketCategories must be a JSON string or array');
  }, { toClassOnly: true })
  ticketCategories?: UpdateTicketCategoryDto[];
}
