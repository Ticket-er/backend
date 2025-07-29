import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Headers,
  Patch,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { SetWalletPinDto } from './dto/set-wallet-pin.dto';

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

  @Patch('pin')
  @UseGuards(JwtGuard)
  async setWalletPin(@Req() req, @Body() dto: SetWalletPinDto) {
    return this.walletService.setWalletPin(req.user.sub, dto);
  }

  @Get('pin-status')
  @ApiOperation({
    summary: 'Check if wallet PIN is set for authenticated user',
  })
  async hasWalletPin(@Req() req) {
    return this.walletService.hasWalletPin(req.user.sub);
  }
}
