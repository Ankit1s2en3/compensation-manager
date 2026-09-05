import { and, eq } from 'drizzle-orm';

import type {
  ActiveRateSet,
  ExchangeRateProvider,
} from '../../application/ports/ExchangeRateProvider.js';
import type { Database } from '../db.js';
import { exchangeRates, fxRateSets } from '../schema.js';

export class DrizzleExchangeRateProvider implements ExchangeRateProvider {
  constructor(private readonly db: Database) {}

  async activeRateSet(): Promise<ActiveRateSet> {
    const [row] = await this.db
      .select({ id: fxRateSets.id, asOfDate: fxRateSets.asOfDate })
      .from(fxRateSets)
      .where(eq(fxRateSets.isActive, true))
      .limit(1);

    if (row === undefined) {
      throw new Error('no active fx_rate_set');
    }
    return { id: String(row.id), asOfDate: row.asOfDate };
  }

  async rateFor(currency: string): Promise<number> {
    const active = await this.activeRateSet();
    const [row] = await this.db
      .select({ rate: exchangeRates.rateToBase })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.rateSetId, Number(active.id)),
          eq(exchangeRates.currencyCode, currency),
        ),
      )
      .limit(1);

    if (row === undefined) {
      throw new Error(`no rate for ${currency} in the active rate set`);
    }
    return Number(row.rate);
  }
}
