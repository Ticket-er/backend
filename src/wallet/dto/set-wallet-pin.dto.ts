import { IsOptional, IsString, Matches } from 'class-validator';

export class SetWalletPinDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Old PIN must be exactly 4 digits' })
  oldPin?: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'New PIN must be exactly 4 digits' })
  newPin: string;
}
