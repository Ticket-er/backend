import { IsNumber, Min } from 'class-validator';

export class ListResaleDto {
  @IsNumber({}, { message: 'Resale price must be a number' })
  @Min(1, { message: 'Resale price must be at least 1' })
  resalePrice: number;
}
