import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class InitiateDto {
  @IsObject()
  @IsNotEmpty()
  customer: CustomerDto;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsNotEmpty()
  processor: string;

  @IsString()
  @IsOptional()
  narration?: string;

  @IsString()
  @IsOptional()
  notification_url?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
