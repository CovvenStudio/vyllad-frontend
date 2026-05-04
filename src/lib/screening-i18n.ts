/**
 * screening-i18n.ts
 *
 * Thin wrappers around i18next for screening display strings.
 * The underlying translations live in src/locales/{locale}/screening.json.
 *
 * All function signatures are preserved so existing call sites are unaffected.
 */

import i18n from '@/lib/i18n';

const ns = 'screening';

export function tScreeningCategory(key: string): string {
  return i18n.t(`${ns}:categories.${key.toLowerCase()}`, { defaultValue: key });
}

export function tQuestionLabel(key: string, fallback: string): string {
  return i18n.t(`${ns}:questions.${key}`, { defaultValue: fallback });
}

export function tQuestionDescription(key: string, fallback?: string): string {
  return i18n.t(`${ns}:descriptions.${key}`, { defaultValue: fallback ?? '' });
}

export function tScreeningOption(value: string): string {
  return i18n.t(`${ns}:options.${value}`, { defaultValue: value });
}
