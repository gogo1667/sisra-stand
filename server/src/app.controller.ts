import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

type SaleLineDto = {
  timestamp: string;
  itemId: string;
  itemName: string;
  quantity: number;
  priceEach: number;
  total: number;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('sales')
  recordSale(@Body() body: { lines: SaleLineDto[] }) {
    this.appService.appendSale(body.lines || []);
    return { ok: true };
  }

  @Get('summary')
  getSummary() {
    return this.appService.getSummary();
  }
}
