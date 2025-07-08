import { IsString, IsNotEmpty } from 'class-validator';

export class BuyNewDto {
  @IsString()
  @IsNotEmpty({ message: 'Event ID cannot be empty' })
  eventId: string;
}
