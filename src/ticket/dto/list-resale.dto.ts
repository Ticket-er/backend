import { IsArray, IsNumber, IsString, Min } from 'class-validator';

export class ListResaleDto {
  @IsNumber({}, { message: 'Resale price must be a number' })
  @Min(1, { message: 'Resale price must be at least 1' })
  resalePrice: number;

  @IsArray({ message: 'Ticket IDs must be an array' })
  @IsString({ each: true, message: 'Each ticket ID must be a string' })
  ticketIds: string[];
}
