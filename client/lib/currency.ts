/**
 * Currency utility functions for converting currency codes to symbols
 */

interface CurrencyMap {
  [key: string]: string;
}

// Common currency code to symbol mapping
const CURRENCY_SYMBOLS: CurrencyMap = {
  // Major currencies
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'CHF': '₣',
  'CAD': 'C$',
  'AUD': 'A$',
  'NZD': 'NZ$',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'CZK': 'Kč',
  'HUF': 'Ft',
  'RUB': '₽',
  'INR': '₹',
  'KRW': '₩',
  'SGD': 'S$',
  'HKD': 'HK$',
  'THB': '฿',
  'MYR': 'RM',
  'IDR': 'Rp',
  'PHP': '₱',
  'VND': '₫',
  'BRL': 'R$',
  'MXN': '$',
  'ARS': '$',
  'CLP': '$',
  'COP': '$',
  'PEN': 'S/',
  'ZAR': 'R',
  'EGP': 'E£',
  'TRY': '₺',
  'ILS': '₪',
  'SAR': '﷼',
  'AED': 'د.إ',
  'QAR': 'ر.ق',
  'KWD': 'د.ك',
  'BHD': '.د.ب',
  'OMR': 'ر.ع.',
  'JOD': 'د.ا',
  'LBP': 'ل.ل',
  'PKR': '₨',
  'BDT': '৳',
  'LKR': '₨',
  'NPR': '₨',
  'BTN': 'Nu.',
  'AFN': '؋',
  'IRR': '﷼',
  'IQD': 'ع.د',
  'SYP': 'ل.س',
  'YER': '﷼',
  'MAD': 'د.م.',
  'TND': 'د.ت',
  'DZD': 'د.ج',
  'LYD': 'ل.د',
  'SDG': 'ج.س.',
  'ETB': 'Br',
  'KES': 'KSh',
  'UGX': 'USh',
  'TZS': 'TSh',
  'RWF': 'RF',
  'BIF': 'FBu',
  'DJF': 'Fdj',
  'SOS': 'Sh.So.',
  'ERN': 'Nfk',
  'GHS': 'GH₵',
  'NGN': '₦',
  'XOF': 'CFA',
  'XAF': 'FCFA',
  'GMD': 'D',
  'SLE': 'Le',
  'LRD': 'L$',
  'CIV': 'CFA',
  'GNF': 'FG',
  'SLL': 'Le',
  'MRU': 'UM',
  'CVE': '$',
  'STN': 'Db',
  'AOA': 'Kz',
  'MZN': 'MT',
  'SZL': 'L',
  'LSL': 'L',
  'BWP': 'P',
  'NAD': 'N$',
  'ZMW': 'ZK',
  'ZWL': 'Z$',
  'MWK': 'MK',
  'MGA': 'Ar',
  'KMF': 'CF',
  'SCR': '₨',
  'MUR': '₨',
  'MVR': '.ރ'
};

/**
 * Get currency symbol from currency code
 * @param currencyCode - Three-letter currency code (e.g., 'USD', 'EUR')
 * @param fallback - Optional fallback symbol if currency code not found
 * @returns Currency symbol string
 */
export function getCurrencySymbol(currencyCode: string, fallback?: string): string {
  if (!currencyCode) {
    return fallback || '$';
  }
  
  const upperCode = currencyCode.toString().toUpperCase().trim();
  return CURRENCY_SYMBOLS[upperCode] || fallback || upperCode;
}

/**
 * Format currency amount with proper symbol
 * @param amount - Numeric amount
 * @param currencyCode - Three-letter currency code
 * @param decimals - Number of decimal places (default: 2)
 * @param symbolPosition - Position of symbol ('before' or 'after', default: 'before')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number, 
  currencyCode: string, 
  decimals: number = 2,
  symbolPosition: 'before' | 'after' = 'before'
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = amount.toFixed(decimals);
  
  // Format number with thousand separators
  const parts = formattedAmount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = parts.join('.');
  
  // Always place symbol before amount as requested
  if (symbolPosition === 'after') {
    return `${formattedNumber} ${symbol}`;
  } else {
    return `${symbol} ${formattedNumber}`;
  }
}

export function formatTotalEmployeeTable(
  amount: number, 
  decimals: number = 2,
): string {
  const formattedAmount = amount.toFixed(decimals);
  
  // Format number with thousand separators
  const parts = formattedAmount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = parts.join('.');
  
  return `${formattedNumber}`;
}

/**
 * Check if currency code is valid
 * @param currencyCode - Currency code to validate
 * @returns Boolean indicating if currency code is supported
 */
export function isValidCurrencyCode(currencyCode: string): boolean {
  if (!currencyCode) return false;
  return currencyCode.toUpperCase() in CURRENCY_SYMBOLS;
}

/**
 * Get all supported currency codes
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_SYMBOLS);
}

// Shared major currency options used in dropdowns (AdminCurrencyAccounts, AddProject)
export const MAJOR_CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: 'EUR', label: `${getCurrencySymbol('EUR')} EUR (Euro)` },
  { code: 'USD', label: `${getCurrencySymbol('USD')} USD (US Dollar)` },
  { code: 'GBP', label: `${getCurrencySymbol('GBP')} GBP (British Pound)` },
  { code: 'CAD', label: `${getCurrencySymbol('CAD')} CAD (Canadian Dollar)` },
  { code: 'AUD', label: `${getCurrencySymbol('AUD')} AUD (Australian Dollar)` },
  { code: 'JPY', label: `${getCurrencySymbol('JPY')} JPY (Japanese Yen)` },
  { code: 'CHF', label: `${getCurrencySymbol('CHF')} CHF (Swiss Franc)` },
  { code: 'INR', label: `${getCurrencySymbol('INR')} INR (Indian Rupee)` },
];
