export interface ActiveRateSet {
  id: string;
  asOfDate: string;
}

export interface ExchangeRateProvider {
  /** The single active fx_rate_set (R3). Throws if none is active. */
  activeRateSet(): Promise<ActiveRateSet>;

  /**
   * The active set's rate for `currency` against the base currency, as a plain
   * number — this feeds the one permitted float multiply (data-model.md §4).
   */
  rateFor(currency: string): Promise<number>;
}
