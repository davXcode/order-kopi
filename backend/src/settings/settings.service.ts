import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

const STORE_OPEN_KEY = 'store_open';
const STORE_CLOSE_FROM_KEY = 'store_close_from';
const STORE_OPEN_UNTIL_KEY = 'store_open_until';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  async getStoreStatus() {
    const openRow = await this.repo.findOne({ where: { key: STORE_OPEN_KEY } });
    const closeFromRow = await this.repo.findOne({
      where: { key: STORE_CLOSE_FROM_KEY },
    });
    const openUntilRow = await this.repo.findOne({
      where: { key: STORE_OPEN_UNTIL_KEY },
    });

    return {
      open: openRow ? openRow.value === 'true' : true,
      closeFrom: closeFromRow?.value || null, // "YYYY-MM-DD"
      openUntil: openUntilRow?.value || null, // "YYYY-MM-DD"
    };
  }

  async setStoreStatus(
    open: boolean,
    closeFrom?: string | null,
    openUntil?: string | null,
  ) {
    await this.repo.save({
      key: STORE_OPEN_KEY,
      value: open ? 'true' : 'false',
    });

    if (closeFrom !== undefined) {
      await this.repo.save({
        key: STORE_CLOSE_FROM_KEY,
        value: closeFrom ?? '',
      });
    }
    if (openUntil !== undefined) {
      await this.repo.save({
        key: STORE_OPEN_UNTIL_KEY,
        value: openUntil ?? '',
      });
    }

    return {
      open,
      closeFrom: closeFrom ?? null,
      openUntil: openUntil ?? null,
    };
  }
}
