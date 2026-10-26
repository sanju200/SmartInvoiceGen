import { describe, it, expect, vi, afterAll, beforeAll } from 'vitest';
import { getLastDateOfCurrentMonth, getCurrentMonthYear, getPaymentDueDate } from '../date-utils';

describe('Date Utility Functions', () => {
  // Mock the system date to ensure consistent test results
  const mockDate = new Date('2024-07-15T10:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterAll(() => {
    // Restore the original system time after all tests
    vi.useRealTimers();
  });

  describe('getLastDateOfCurrentMonth', () => {
    it('should return the last date of the current month in YYYY-MM-DD format', () => {
      // July 2024 has 31 days
      expect(getLastDateOfCurrentMonth()).toBe('2024-07-31');
    });

    it('should handle leap years (February 2024 has 29 days)', () => {
      const original = new Date(mockDate);
      vi.setSystemTime(new Date('2024-02-10T12:00:00Z'));
      expect(getLastDateOfCurrentMonth()).toBe('2024-02-29');
      vi.setSystemTime(original);
    });

    it('should handle non-leap year February (2023-02-28)', () => {
      const original = new Date(mockDate);
      vi.setSystemTime(new Date('2023-02-10T12:00:00Z'));
      expect(getLastDateOfCurrentMonth()).toBe('2023-02-28');
      vi.setSystemTime(original);
    });
  });

  describe('getCurrentMonthYear', () => {
    it('should return the full month name and year', () => {
      expect(getCurrentMonthYear()).toBe('July 2024');
    });

    it('should reflect updated mocked system time', () => {
      const original = new Date(mockDate);
      vi.setSystemTime(new Date('2025-03-01T00:00:00Z'));
      expect(getCurrentMonthYear()).toBe('March 2025');
      vi.setSystemTime(original);
    });
  });

  describe('getPaymentDueDate', () => {
    it('should calculate the payment due date 15 days from the invoice date by default', () => {
      const invoiceDate = '2024-07-15';
      expect(getPaymentDueDate(invoiceDate)).toBe('2024-07-30');
    });

    it('should calculate the payment due date correctly for a custom number of days', () => {
      const invoiceDate = '2024-07-15';
      expect(getPaymentDueDate(invoiceDate, 30)).toBe('2024-08-14');
    });

    it('should handle month rollovers correctly', () => {
      const invoiceDate = '2024-07-25';
      expect(getPaymentDueDate(invoiceDate, 10)).toBe('2024-08-04');
    });

    it('should handle year rollovers correctly', () => {
        const invoiceDate = '2024-12-20';
        expect(getPaymentDueDate(invoiceDate, 15)).toBe('2025-01-04');
    });

    it('should return the same date for 0-day terms', () => {
      const invoiceDate = '2024-07-15';
      expect(getPaymentDueDate(invoiceDate, 0)).toBe('2024-07-15');
    });

    it('should pad month and day with leading zeros', () => {
      const invoiceDate = '2024-01-05';
      expect(getPaymentDueDate(invoiceDate, 5)).toBe('2024-01-10');
    });

    it('should handle long spans across months (Jan 31 + 30 days -> Mar 01 non-leap)', () => {
      const invoiceDate = '2023-01-31';
      expect(getPaymentDueDate(invoiceDate, 30)).toBe('2023-03-02');
    });
  });
});
