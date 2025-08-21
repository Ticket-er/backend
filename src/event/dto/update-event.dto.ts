import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EventCategory } from '@prisma/client';

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
  ticketCategories?: {
    id?: string; // Optional ID to match existing category
    name?: string; // Optional name to match existing category
    price: number;
    maxTickets: number;
  }[];
}
