/* eslint-disable prettier/prettier */
import { IsString } from 'class-validator';

export class DeleteEventDto {
  @IsString()
  eventId: string;
}
