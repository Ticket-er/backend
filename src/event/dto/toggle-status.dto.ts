import { IsBoolean } from 'class-validator';

export class ToggleEventStatusDto {
  @IsBoolean({ message: 'Status must be true or false' })
  isActive: boolean;
}
