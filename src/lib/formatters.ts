/**
 * formatters.ts
 *
 * Locale-aware formatting utilities.
 * Always pass the current locale from `i18n.language` or `useTranslation`.
 */

/**
 * Format a date string or Date object.
 * @param date - ISO string or Date
 * @param locale - BCP-47 locale tag (e.g. 'pt-PT', 'en')
 * @param options - Intl.DateTimeFormat options
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  } catch {
    return String(date);
  }
}

/**
 * Format a monetary amount.
 * @param cents - Amount in smallest currency unit (cents)
 * @param currency - ISO 4217 currency code (e.g. 'EUR', 'BRL', 'USD')
 * @param locale - BCP-47 locale tag
 */
export function formatMoney(
  cents: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * Format a number with locale-specific separators.
 */
export function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Get the display name of a country from its ISO alpha-2 code.
 * @param code - ISO 3166-1 alpha-2 code (e.g. 'PT', 'BR')
 * @param locale - BCP-47 locale tag for the display language
 */
export function getCountryName(code: string | null | undefined, locale: string): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Format a relative duration in months → human readable.
 * @param months - Duration in months
 * @param locale - For future plural support
 */
export function formatDurationMonths(months: number, locale: string): string {
  if (months >= 12) {
    const years = Math.floor(months / 12);
    // Simple approach — can be extended with i18n plural keys
    if (locale.startsWith('pt')) {
      return years === 1 ? '1 ano' : `${years} anos`;
    }
    return years === 1 ? '1 year' : `${years} years`;
  }
  if (locale.startsWith('pt')) {
    return months === 1 ? '1 mês' : `${months} meses`;
  }
  return months === 1 ? '1 month' : `${months} months`;
}
