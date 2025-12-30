import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('dav-order')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('store')
  getStore() {
    return this.service.getStoreStatus();
  }

  @Patch('store')
  setStore(
    @Body()
    body: {
      open: boolean;
      closeFrom?: string | null;
      openUntil?: string | null;
    },
  ) {
    return this.service.setStoreStatus(
      !!body.open,
      body.closeFrom ?? null,
      body.openUntil ?? null,
    );
  }
}
