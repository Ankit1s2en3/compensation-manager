/**
 * An amount of money: an integer count of minor units plus a currency code.
 * Immutable — every operation returns a new instance.
 */
export class Money {
  private constructor(
    readonly amountMinor: number,
    readonly currency: string,
  ) {}

  static of(amountMinor: number, currency: string): Money {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(
        `Money amount must be a whole number of minor units, got ${amountMinor}`,
      );
    }
    return new Money(amountMinor, currency);
  }
}
