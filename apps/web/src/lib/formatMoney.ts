import type { MoneyResponse } from '@/api/types';

/**
 * Display-only. The division below produces a float — that float is for
 * Intl.NumberFormat's eyes only and must never be sent back to the server;
 * every write still sends the integer amountMinor untouched. exponent comes
 * from the server (currency-table-driven, per CLAUDE.md) — never hardcode
 * "divide by 100" here.
 */
export function formatMoney({ amountMinor, currency, exponent }: MoneyResponse): string {
  const displayValue = amountMinor / 10 ** exponent;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(displayValue);
}
