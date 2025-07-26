import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuyResaleDto {
  @ApiProperty({
    description: 'Array of resale ticket IDs to purchase',
    example: ['789a123b-456c-78d9-e012-3456789f1234'],
    type: [String],
  })
  @IsArray({ message: 'Ticket IDs must be an array' })
  @ArrayNotEmpty({ message: 'Ticket ID list cannot be empty' })
  @IsString({ each: true, message: 'Each ticket ID must be a string' })
  ticketIds: string[];
}
