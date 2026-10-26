/**
 * Common regular expressions used for form validation across the application
 */

export const REGEX = {
  // Matches any string that contains at least one letter (for name validations)
  CONTAINS_LETTER: /[a-zA-Z]/, 
  
  // Matches strings containing only numbers
  ONLY_NUMBERS: /^\d+$/,
  
  // Standard email validation
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Phone number validation (allows international format with +, digits, and common separators)
  PHONE: /^[+]?[0-9\s\-()]{7,}$/,
  
  // Project identifier (alphanumeric with some special chars)
  PROJECT_IDENTIFIER: /^[A-Za-z0-9-_.]+$/,
  
  // Positive integers (for payment terms, quantities, etc.)
  POSITIVE_INTEGER: /^\d+$/,
  
  // Currency amount (supports decimals with optional 2 decimal places)
  CURRENCY: /^\d+(\.\d{1,2})?$/
} as const;

export type RegexKey = keyof typeof REGEX;
