import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Min,
  IsDate,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString({ message: 'Event name must be a string' })
  @IsNotEmpty({ message: 'Event name cannot be empty' })
  @MaxLength(100, { message: 'Event name is too long' })
  name?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be at least 0' })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Max tickets must be a number' })
  @Min(1, { message: 'There must be at least one ticket' })
  maxTickets?: number;

  @IsOptional()
  @IsString({ message: 'Event description must be a string' })
  @MaxLength(500, { message: 'Event description is too long' })
  description?: string;

  @IsDate({ message: 'Date must be valid' })
  date: Date;
}
