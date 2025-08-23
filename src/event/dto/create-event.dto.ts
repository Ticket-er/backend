/* eslint-disable prettier/prettier */
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventCategory } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

class TicketCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  maxTickets: number;
}

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description can not exceed 500 words (approx 2500 characters).',
  })
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsEnum(EventCategory)
  category: EventCategory;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketCategoryDto)
  @Transform(({ value }) => {
    // Handle string input (JSON)
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

    // Handle direct array
    if (Array.isArray(value)) {
      return value;
    }

    throw new BadRequestException('ticketCategories must be a JSON string or array');
  }, { toClassOnly: true })
  ticketCategories: TicketCategoryDto[];
}
