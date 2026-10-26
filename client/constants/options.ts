export const AGREEMENT_TYPES = ['SOW', 'MSA'] as const;
export type AgreementType = typeof AGREEMENT_TYPES[number];

export const TAX_ID_TYPES = ['VAT', 'FISCAL_ID'] as const;
export type TaxIdType = typeof TAX_ID_TYPES[number];

export const NET_TERMS = [15, 30, 45] as const;
export type NetTerm = typeof NET_TERMS[number];

export const CURRENCIES = ['EUR', 'USD', 'INR'] as const;
export type CurrencyCode = typeof CURRENCIES[number];
