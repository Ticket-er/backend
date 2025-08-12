import { IsString } from 'class-validator';

export class RemoveResaleDto {
  @IsString({ message: 'Ticket ID must be a string' })
  ticketId: string;
}
