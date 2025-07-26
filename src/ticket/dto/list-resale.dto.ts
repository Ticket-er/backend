import { IsNumber, IsString, Min } from 'class-validator';

export class ListResaleDto {
  @IsNumber({}, { message: 'Resale price must be a number' })
  @Min(1, { message: 'Resale price must be at least 1' })
  resalePrice: number;

  @IsString({ message: 'Ticket ID must be a string' })
  ticketId: string;

  @IsString({ message: 'Bank code is required' })
  bankCode: string;

  @IsString({ message: 'Account number is required' })
  accountNumber: string;
}
