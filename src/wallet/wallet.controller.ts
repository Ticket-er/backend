import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance of authenticated user' })
  async getBalance(@Req() req) {
    return this.walletService.checkBalance(req.user.sub);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history of authenticated user' })
  async getTransactionHistory(@Req() req) {
    return this.walletService.getTransactions(req.user.sub);
  }

  @Post('fund')
  @ApiOperation({
    summary: 'Add funds to wallet',
    description:
      'Used after successful payment (e.g., webhook or client call). Increments wallet balance.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 5000 },
      },
      required: ['amount'],
    },
  })
  @Post('withdraw')
  @ApiOperation({
    summary: 'Withdraw funds to bank account',
    description:
      'Initiates a payout via payment aggregator and deducts wallet balance.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        name: { type: 'string', example: 'John Doe' },
        amount: { type: 'number', example: 3000 },
        account_number: { type: 'string', example: '0123456789' },
        bank_code: { type: 'string', example: '058' },
        narration: { type: 'string', example: 'Wallet withdrawal' },
      },
      required: ['email', 'name', 'amount', 'account_number', 'bank_code'],
    },
  })
  async withdraw(@Body() body, @Req() req) {
    return this.walletService.withdraw(req.user.sub, body);
  }
}
