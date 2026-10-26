import { describe, it, expect } from 'vitest';
import {
  getCurrencySymbol,
  formatCurrency,
  isValidCurrencyCode,
  getSupportedCurrencies,
  MAJOR_CURRENCY_OPTIONS,
} from '../currency';

describe('currency utilities', () => {
  describe('getCurrencySymbol', () => {
    it('returns symbol for known codes (USD, EUR, GBP)', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(getCurrencySymbol(' usd ')).toBe('$');
      expect(getCurrencySymbol('eur')).toBe('€');
    });

    it('returns fallback for unknown codes when provided', () => {
      expect(getCurrencySymbol('XXX', '?')).toBe('?');
      expect(getCurrencySymbol('', '?')).toBe('?');
    });

    it('returns uppercased code when unknown and no fallback provided', () => {
      expect(getCurrencySymbol('xyz')).toBe('XYZ');
    });
  });

  describe('formatCurrency', () => {
    it('formats with symbol before amount by default', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$ 1,234.56');
      expect(formatCurrency(999, 'EUR')).toBe('€ 999.00');
    });

    it('supports placing symbol after amount', () => {
      expect(formatCurrency(100, 'USD', 2, 'after')).toBe('100.00 $');
    });

    it('applies decimal rounding and thousand separators', () => {
      expect(formatCurrency(1234567.891, 'USD', 2)).toBe('$ 1,234,567.89');
      expect(formatCurrency(1234567.899, 'USD', 2)).toBe('$ 1,234,567.90');
      expect(formatCurrency(1234567.5, 'USD', 0)).toBe('$ 1,234,568');
    });

    it('works with negatives and small numbers', () => {
      expect(formatCurrency(-42.78, 'USD')).toBe('$ -42.78');
      expect(formatCurrency(0.004, 'USD', 2)).toBe('$ 0.00');
    });

    it('uses fallback behavior for unknown currency codes', () => {
      // Unknown code without fallback -> symbol is the uppercased code
      expect(formatCurrency(50, 'xyz')).toBe('XYZ 50.00');
      // Unknown code with symbol after
      expect(formatCurrency(50, 'xyz', 2, 'after')).toBe('50.00 XYZ');
    });
  });

  describe('isValidCurrencyCode', () => {
    it('returns true for known codes and false otherwise', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
      expect(isValidCurrencyCode('eur')).toBe(true);
      expect(isValidCurrencyCode('xyz')).toBe(false);
      expect(isValidCurrencyCode('')).toBe(false);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('includes known codes and is non-empty', () => {
      const list = getSupportedCurrencies();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(10);
      expect(list).toContain('USD');
      expect(list).toContain('EUR');
      expect(list).toContain('INR');
    });
  });

  describe('MAJOR_CURRENCY_OPTIONS', () => {
    it('contains expected major options with proper symbols in labels', () => {
      const codes = MAJOR_CURRENCY_OPTIONS.map(o => o.code);
      expect(codes).toEqual(expect.arrayContaining(['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR']));

      const eur = MAJOR_CURRENCY_OPTIONS.find(o => o.code === 'EUR');
      const usd = MAJOR_CURRENCY_OPTIONS.find(o => o.code === 'USD');
      expect(eur?.label.startsWith('€')).toBe(true);
      expect(usd?.label.startsWith('$')).toBe(true);
    });
  });
});
