export const DEFAULTS = {
  currency: 'EUR' as const,
  paymentDueDays: 30 as const,
  agreementType: 'SOW' as const,
  taxIdentificationType: 'VAT' as const,
};

export const ROUTES = {
  index: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  preview: (id: string) => `/preview/${id}`,
} as const;

export const API = {
  projects: '/projects',
  project: (id: string) => `/projects/${id}`,
} as const;
