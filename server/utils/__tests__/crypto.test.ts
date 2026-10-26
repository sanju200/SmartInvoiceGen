import { describe, it, expect, vi } from 'vitest';
import { encryptAccountNumber, decryptAccountNumber, last4OfAccount } from '../crypto';

describe('Crypto Utilities', () => {
  // Mock environment variables
  vi.stubEnv('ACCOUNT_ENC_KEY', 'test-secret-key-for-encryption');

  describe('encryptAccountNumber and decryptAccountNumber', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const originalAccount = '1234567890123456';
      const encrypted = encryptAccountNumber(originalAccount);
      const decrypted = decryptAccountNumber(encrypted);
      expect(decrypted).toBe(originalAccount);
    });

    it('should produce different encrypted strings for the same input due to random IV', () => {
      const originalAccount = '9876543210987654';
      const encrypted1 = encryptAccountNumber(originalAccount);
      const encrypted2 = encryptAccountNumber(originalAccount);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw an error when decrypting an invalid payload', () => {
      const invalidPayload = 'invalid:payload:string';
      expect(() => decryptAccountNumber(invalidPayload)).toThrow('Decryption failed. The payload may be corrupt or invalid.');
    });

    it('should throw an error for a malformed encrypted string', () => {
        const malformedPayload = 'justonepart';
        expect(() => decryptAccountNumber(malformedPayload)).toThrow('Invalid encrypted payload');
    });
  });

  describe('last4OfAccount', () => {
    it('should return the last 4 digits of a numeric string', () => {
      expect(last4OfAccount('1234567890')).toBe('7890');
    });

    it('should strip non-digit characters before getting the last 4 digits', () => {
      expect(last4OfAccount('1234-5678-9012')).toBe('9012');
    });

    it('should pad with zeros if there are fewer than 4 digits', () => {
      expect(last4OfAccount('123')).toBe('0123');
    });

    it('should handle an empty string', () => {
      expect(last4OfAccount('')).toBe('0000');
    });

    it('should handle a string with only non-digits', () => {
        expect(last4OfAccount('abcd-efgh')).toBe('0000');
    });
  });
});
