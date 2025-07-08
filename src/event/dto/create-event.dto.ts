import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  MaxLength,
  IsDate,
} from 'class-validator';

export class CreateEventDto {
  @IsString({ message: 'Event name must be a string' })
  @IsNotEmpty({ message: 'Event name is required' })
  @MaxLength(100, {
    message: 'Event name cannot be longer than 100 characters',
  })
  name: string;

  @IsNumber({}, { message: 'Ticket price must be a number' })
  @Min(0, { message: 'Ticket price must be at least 0 (free or paid)' })
  price: number;

  @IsNumber({}, { message: 'Maximum number of tickets must be a number' })
  @Min(1, { message: 'There must be at least one ticket for an event' })
  maxTickets: number;

  @IsDate({ message: 'Date must be valid' })
  date: Date;
}
