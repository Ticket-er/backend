import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('notification')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook for transaction verification',
    description:
      'Endpoint to verify transactions after receiving payment webhook.',
  })
  @ApiBody({
    description: 'Payment processor sends reference to confirm transaction',
    schema: {
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          example: 'txn_1720781234567_xyzab',
          description: 'Transaction reference to verify',
        },
      },
      required: ['reference'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction verified and processed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        ticketIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  verifyWebhook(@Body('reference') reference: string) {
    return this.paymentService.verifyTransaction(reference);
  }
}
