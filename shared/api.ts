export interface DemoResponse {
  message: string;
}

// Database models matching Prisma schema
export interface Employee {
  id: string;
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AgreementType = 'SOW' | 'MSA';

export type TaxIdentificationType = 'VAT' | 'FISCAL_ID';

export interface Project {
  invoiceNumber: string;
  id: string;
  name: string;
  isCopy?: boolean;
  originalProjectId?: string | null;
  description?: string;
  uniqueProjectIdentifier?: string;
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  email: string;
  phoneNumber?: string;
  agreementType: AgreementType;
  agreementRef: string;
  poNumber?: string;
  vatPercentage?: number;
  taxIdentificationType?: TaxIdentificationType;
  taxNumber?: string | null;
  invoicePurpose: string;
  currency: string;
  status: string;
  paymentDueDays?: number;
  // Persisted work period label like "March 2025"; independent from invoiceDate
  workPeriod?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  employees: Employee[];
  user?: {
    id: string;
    name: string;
    email: string;
  };
  // Persisted import metadata
  lastImportedAt?: Date | string | null;
  lastImportedTab?: string | null;
  lastImportedEmployeeCount?: number | null;
  lastImportedInvoiceDate?: Date | string | null;
  // Optional legacy fields used by some UI components
  invoiceDate?: string;
  paymentDueDate?: string;

  // Persisted generic excel uploads (latest used for generic invoice preview)
  genericExcelUploads?: GenericExcelUpload[];

  // Lightweight dashboard hint set by the list endpoint
  hasGenericExcelUpload?: boolean;

  // Optional: number of generic sheet uploads for this project (used for dashboard badge)
  genericExcelSheetCount?: number;
}

export interface GenericExcelUploadPayload {
  fileName?: string;
  sheetName: string;
  invoiceDate?: string;
  headers: string[];
  rows: string[][];
}

export interface GenericExcelUpload {
  id: string;
  projectId: string;
  fileName?: string | null;
  sheetName: string;
  headers: string[];
  rows: string[][];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// API Request/Response types
export interface CreateProjectRequest {
  name: string;
  isCopy?: boolean;
  originalProjectId?: string;
  description?: string;
  uniqueProjectIdentifier: string;
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  email: string;
  phoneNumber?: string;
  agreementType?: AgreementType; // default SOW
  agreementRef: string;
  poNumber?: string;
  vatPercentage?: number;
  invoicePurpose: string;
  currency?: string;
  taxIdentificationType?: 'VAT' | 'FISCAL_ID';
  taxNumber?: string;
  status?: string;
  paymentDueDays?: number;
  employees?: {
    name: string;
    ratePerHour: number;
    hours: number;
    total: number;
  }[];
  genericExcelUpload?: GenericExcelUploadPayload;
  genericExcelUploads?: GenericExcelUploadPayload[];
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  taxNumber?: string | null;
  taxIdentificationType?: 'VAT' | 'FISCAL_ID' | null;
}

export interface CreateEmployeeRequest {
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
}

export interface APIError {
  error: string;
  details?: string;
}

// Currency Accounts
export interface CurrencyAccount {
  id: string;
  currency: string;
  last4: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCurrencyAccountRequest {
  currency: string;
  accountNumber: string; // plain on wire; server encrypts
  userId?: string; // optional; defaults to current admin user
}

export interface UpdateCurrencyAccountRequest {
  currency?: string;
  accountNumber?: string;
}

// Company
export interface Company {
  id: string;
  name: string;
  address: string;
  cinNumber?: string | null;
  gstNumber?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
  swiftCode?: string | null;
  remittingBankName?: string | null;
  remittingCurrency?: string | null;
  remittingAccountNo?: string | null;
  remittingSwiftCode?: string | null;
  remittingIbanNo?: string | null;
  remittingAbaFedNo?: string | null;
  // Signing section
  signatureImage?: string | null; // base64 data URL or URL
  companyStampImage?: string | null; // base64 data URL or URL
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  userId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
