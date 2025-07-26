import {
  IsArray,
  IsString,
  ArrayNotEmpty,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
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

  @ApiProperty({
    description: 'Whether to use wallet balance for the purchase',
    example: true,
  })
  @IsNotEmpty({ message: 'Use wallet cannot be empty' })
  @IsBoolean({ message: 'Use wallet must be a boolean' })
  useWallet?: boolean;
}
