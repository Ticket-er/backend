import { IsString, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyNewDto {
  @ApiProperty({
    description: 'UUID of the event to buy a ticket for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'Event ID cannot be empty' })
  eventId: string;

  @ApiProperty({
    description: 'Number of tickets to purchase (max 10)',
    example: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsNotEmpty({ message: 'Quantity cannot be empty' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(1, { message: 'You must buy at least 1 ticket' })
  @Max(10, { message: 'Quantity cannot exceed 10' })
  quantity: number;

  @ApiProperty({
    description: 'ID of the ticket category to purchase',
    example: 'cat123',
  })
  @IsNotEmpty()
  @IsString()
  ticketCategoryId: string;
}
