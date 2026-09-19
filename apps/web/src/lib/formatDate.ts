/**
 * `new Date(iso)` on a bare "YYYY-MM-DD" string parses as UTC midnight, which
 * displays as the previous calendar day in any timezone west of UTC. Appending
 * a local time-of-day forces the Date constructor's local-time parse branch
 * instead, so the calendar day shown always matches the day stored.
 */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
