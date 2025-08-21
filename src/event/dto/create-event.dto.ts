import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EventCategory } from '@prisma/client';

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

  @IsArray()
  @IsNotEmpty()
  ticketCategories: {
    name: string;
    price: number;
    maxTickets: number;
  }[];
}
