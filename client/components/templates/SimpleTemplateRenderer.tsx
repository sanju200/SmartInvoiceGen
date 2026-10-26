import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import type { InvoiceTemplate } from '../../types/templates';
import { CompanyLogo } from "../ui/CompanyLogo";
import { format } from "date-fns";
import { formatCurrency, formatTotalEmployeeTable, getCurrencySymbol } from "../../lib/currency";
import { api } from "@/services/api";
import type { Company, Project } from "@shared/api";
import { MESSAGES } from '@/constants/messages';
import { REGEX } from '@/constants/regex';

// Type for Employee used in the template renderer
type Employee = {
  id: string;
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
};

// Extend the Project type with template-specific fields
export type ProjectWithTemplateFields = Project & {
  employees?: Employee[];
  phoneNumber?: string;
  contactPerson?: string;
  customerName?: string;
  customerAddress?: string;
  email?: string;
  invoicePurpose?: string;
  agreementRef?: string;
  agreementType?: 'SOW' | 'MSA';
  currency?: string;
  status?: string;
  poNumber?: string;
  vatPercentage?: number;
  paymentDueDays?: number;
  invoiceDate?: string;
  paymentDueDate?: string;
  workPeriod?: string;
  totalAmount?: number;
  invoiceNumber?: string;
};


interface FormErrors {
  customerName?: string;
  customerAddress?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  invoicePurpose?: string;
  totalAmount?: string;
  invoiceNumber?: string;
  workPeriod?: string;
  agreementRef?: string;
  taxNumber?: string;
}

interface SimpleTemplateRendererProps {
  project: ProjectWithTemplateFields;
  template: InvoiceTemplate;
  isEditing?: boolean;
  editData?: ProjectWithTemplateFields;
  onInputChange?: (field: string, value: string) => void;
  onValidationChange?: (isValid: boolean, errors: FormErrors) => void;
  includeSignature?: boolean; // controls rendering of stamp/signature block in PDF/UI
  containerId?: string; // allow overriding the invoice container element id
  companyOverride?: Company | null; // optional company passed from parent (dashboard)
  onSaveColumnWidths?: () => void; // callback to save pending column widths to localStorage
  onResetColumnWidths?: () => void; // callback to reset column widths to last saved state
  registerColumnWidthActions?: (actions: { save: () => void; reset: () => void }) => void; // register actions for parent to call
}

export default function SimpleTemplateRenderer({
  project,
  isEditing = false,
  editData,
  onInputChange,
  onValidationChange,
  includeSignature = true,
  containerId,
  companyOverride,
  registerColumnWidthActions,
}: SimpleTemplateRendererProps) {
  const displayData = isEditing ? editData : project;

  const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  const isGenericTotalMetaRow = (row: string[]) =>
    String(row?.[0] ?? '').trim() === '__META_TOTAL__' || normalizeHeader(String(row?.[0] ?? '')) === 'total';

  const parseNumericCell = (val: unknown): number => {
    const raw = String(val ?? '').trim();
    if (!raw) return 0;
    const cleaned = raw.replace(/[^0-9,.-]/g, '');
    let normalized = cleaned;
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        normalized = `${parts[0]}.${parts[1]}`;
      } else {
        normalized = cleaned.replace(/,/g, '');
      }
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };
  
  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Column width state for copy projects - tracks pending (unsaved) widths
  const [pendingColWidths, setPendingColWidths] = useState<Record<string, Record<number, number>>>({});
  // Saved column widths - loaded from localStorage
  const [savedColWidths, setSavedColWidths] = useState<Record<string, Record<number, number>>>({});
  // Track previous isEditing state to detect cancel
  const prevIsEditingRef = React.useRef(isEditing);

  // Reset validation state when switching between edit and view modes
  useEffect(() => {
    if (!isEditing) {
      setErrors({});
      setTouched({});
    }
  }, [isEditing]);

  // Expose validation function to parent via callback
  useEffect(() => {
    if (isEditing && onValidationChange) {
      const isValid = Object.keys(errors).length === 0;
      onValidationChange(isValid, errors);
    }
  }, [errors, isEditing, onValidationChange]);

  // Initialize validation state when entering edit mode
  useEffect(() => {
    if (isEditing && onValidationChange) {
      // Initialize with valid state when entering edit mode
      onValidationChange(true, {});
    }
  }, [isEditing]);

  // Save column widths to localStorage
  const saveAllColumnWidthsToStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      Object.entries(pendingColWidths).forEach(([key, widths]) => {
        localStorage.setItem(key, JSON.stringify(widths));
      });
      // Update saved state to match pending
      setSavedColWidths({ ...pendingColWidths });
    } catch (e) {
      console.error('Failed to save column widths', e);
    }
  }, [pendingColWidths]);

  // Reset column widths to last saved state
  const resetColumnWidths = React.useCallback(() => {
    setPendingColWidths({ ...savedColWidths });
  }, [savedColWidths]);

  // Register actions with parent component
  useEffect(() => {
    if (registerColumnWidthActions) {
      registerColumnWidthActions({
        save: saveAllColumnWidthsToStorage,
        reset: resetColumnWidths,
      });
    }
  }, [registerColumnWidthActions, saveAllColumnWidthsToStorage, resetColumnWidths]);

  // Reset column widths when exiting edit mode without saving (cancel case)
  useEffect(() => {
    // If we just transitioned from editing to not editing, reset pending widths
    if (prevIsEditingRef.current && !isEditing) {
      setPendingColWidths({ ...savedColWidths });
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, savedColWidths]);

  // Validation functions
  const validateField = (field: keyof FormErrors, value: string): string => {
    switch (field) {
      case 'customerName':
        if (!value.trim()) return MESSAGES.customerName;
        if (value.trim().length < 2) return MESSAGES.customerNameMinLength;
        if (REGEX.ONLY_NUMBERS.test(value.trim())) return MESSAGES.customerNameCannotBeOnlyNumbers;
        if (!REGEX.CONTAINS_LETTER.test(value)) return MESSAGES.customerNameMustContainAtLeastOneLetter;
        break;
      
      case 'customerAddress':
        if (!value.trim()) return MESSAGES.customerAddress;
        if (value.trim().length < 5) return MESSAGES.customerAddressMinLength;
        break;
      
      case 'contactPerson':
        if (!value.trim()) return MESSAGES.contactPerson;
        if (value.trim().length < 2) return MESSAGES.contactPersonMinLength;
        if (REGEX.ONLY_NUMBERS.test(value.trim())) return MESSAGES.contactPersonCannotBeOnlyNumbers;
        if (!REGEX.CONTAINS_LETTER.test(value)) return MESSAGES.contactPersonMustContainAtLeastOneLetter;
        break;
      
      case 'email':
        if (!value.trim()) return MESSAGES.customerEmail;
        {
          if (!REGEX.EMAIL.test(value)) return MESSAGES.customerEmailValidation;
        }
        break;
      
      case 'phoneNumber':
        if (!value.trim()) return MESSAGES.phoneNumber;
        break;
      
      case 'invoicePurpose':
        if (!value.trim()) return MESSAGES.invoicePurpose;
        if (value.trim().length < 5) return MESSAGES.invoicePurposeMinLength;
        break;
      
      case 'totalAmount': {
        if (!value.trim()) return 'Total amount is required';
        const amount = parseFloat(value);
        if (isNaN(amount) || amount <= 0) return 'Total amount must be a positive number';
        break;
      }
      
      case 'invoiceNumber':
        if (!value.trim()) return MESSAGES.invoiceNumber;
        if (value.trim().length < 3) return MESSAGES.invoiceNumberMinLength;
        break;
      
      case 'workPeriod':
        if (!value.trim()) return MESSAGES.workPeriod;
        if (value.trim().length < 3) return 'Work period must be at least 3 characters';
        break;
      
      case 'agreementRef':
        if (!value.trim()) return MESSAGES.agreementRef;
        if (value.trim().length < 3) return MESSAGES.agreementRefMinLength;
        break;
        
      case 'taxNumber':
        // Optional field, but if provided, must be at least 2 characters
        if (value.trim() && value.trim().length < 2) return MESSAGES.taxNumberMinLength;
        break;
    }
    return '';
  };

  const handleFieldBlur = (field: keyof FormErrors) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const value = getFieldValue(field);
    const error = validateField(field, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleInputChangeWithValidation = (field: string, value: string) => {
    // Call the original onInputChange
    onInputChange?.(field, value);
    
    // Always validate the field in real-time when user is typing
    const error = validateField(field as keyof FormErrors, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field as keyof FormErrors] = error;
      } else {
        delete newErrors[field as keyof FormErrors];
      }
      return newErrors;
    });
  };

  const getFieldValue = (field: keyof FormErrors): string => {
    switch (field) {
      case 'customerName':
        return displayData?.customerName || '';
      case 'customerAddress':
        return displayData?.customerAddress || '';
      case 'contactPerson':
        return displayData?.contactPerson || '';
      case 'email':
        return displayData?.email || '';
      case 'phoneNumber':
        return displayData?.phoneNumber || '';
      case 'invoicePurpose':
        return displayData?.invoicePurpose || '';
      case 'totalAmount':
        return displayData?.totalAmount?.toString() || '';
      case 'invoiceNumber':
        // When editing, show exact value (even if empty), when viewing show with fallback
        return isEditing ? (displayData?.invoiceNumber ?? '') : (displayData?.invoiceNumber || '');
      case 'workPeriod':
        // When editing, show exact value (even if empty), when viewing show with fallback  
        return isEditing ? (displayData?.workPeriod ?? '') : (displayData?.workPeriod || '');
      case 'agreementRef':
        return displayData?.agreementRef || '';
      case 'taxNumber':
        return displayData?.taxNumber || '';
      default:
        return '';
    }
  };

  // Pagination constants
  const EMPLOYEES_PER_FIRST_PAGE = 15;
  const EMPLOYEES_PER_CONTINUATION_PAGE = 25;

  // localStorage functions for dynamic fields
  const loadDynamicFieldsFromStorage = (projectId?: string) => {
    if (!projectId) return null;
    const key = `dynamicFields_${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  };

  // Generate dynamic fields
  // const getCurrentMonthYear = (): string => {
  //   const now = new Date();
  //   const month = now.toLocaleDateString("en-US", { month: "long" });
  //   const year = now.getFullYear();
  //   return `${month} ${year}`;
  // };


  // Load settings from localStorage populated by Excel upload modal
  const loadSettingsMap = (): Record<
    string,
    {
      invoicePrefix?: string;
      paymentDurationDays?: number;
      accountNumbers?: Record<string, string>;
    }
  > => {
    try {
      const raw = localStorage.getItem("excelProjectSettings");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  };

  const getProjectSettings = (): {
    invoicePrefix?: string;
    paymentDurationDays?: number;
    accountNumbers?: Record<string, string>;
  } => {
    const map = loadSettingsMap();
    const key = (displayData?.name || "").toLowerCase().trim();
    return map[key] || {};
  };

  const normalizeCurrency = (cur: string | undefined): string => {
    const c = (cur || "").toUpperCase().trim();
    const currencyMap: Record<string, string> = {
      EUR: "EUR",
      EURO: "EUR",
      "€": "EUR",
      USD: "USD",
      "US DOLLAR": "USD",
      $: "USD",
      INR: "INR",
      "₹": "INR",
      RUPEE: "INR",
      "INDIAN RUPEE": "INR",
      GBP: "GBP",
      POUND: "GBP",
      "£": "GBP",
    };
    return currencyMap[c] || c;
  };

  const getPaymentDueDate = (
    invoiceDate: string,
    durationOverride?: number,
  ): string => {
    const date = new Date(invoiceDate);
    // Prefer project's DB value, then override from settings, fallback 15
    const duration = Number.isFinite(displayData?.paymentDueDays as number)
      ? (displayData?.paymentDueDays as number)
      : (Number.isFinite(durationOverride as number)
        ? (durationOverride as number)
        : 15);
    date.setDate(date.getDate() + duration);
    return format(date, "yyyy-MM-dd");
  };

  // Derive effective invoice date string (YYYY-MM-DD):
  // 1) localStorage override (when editing session), 2) project/editData invoiceDate,
  // 3) lastImportedInvoiceDate from backend snapshot metadata, 4) today
  const effectiveInvoiceDateStr: string = (() => {
    // const storedFields = loadDynamicFieldsFromStorage(displayData?.id);
    // if (storedFields?.invoiceDate) return storedFields.invoiceDate;
    // Prefer explicitly set invoiceDate first (from editData/project)
    if (displayData?.invoiceDate) return displayData.invoiceDate;
    const val = (displayData as unknown as { lastImportedInvoiceDate?: string | Date })?.lastImportedInvoiceDate;
    if (val) {
      const d = new Date(val as unknown as string);
      if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  })();

  const getMonthYearFromYMD = (ymd: string): string => {
    const d = new Date(ymd);
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  };

  // Convert a Work Period label like "March 2025" to YYYY-MM-DD (first day of that month)
  const workPeriodToYMD = (workPeriod?: string): string | null => {
    if (!workPeriod) return null;
    const [monthName, yearStr] = workPeriod.split(' ');
    if (!monthName || !yearStr) return null;
    const date = new Date(`${monthName} 1, ${yearStr}`);
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  const generateInvoiceNumber = (
    uniqueProjectIdentifier?: string,
    projectName?: string,
    baseDateYMD?: string,
  ): string => {
    // Use invoice date (baseDateYMD) for month/year when provided
    const basis = baseDateYMD ? new Date(baseDateYMD) : new Date();
    const date = isNaN(basis.getTime()) ? new Date() : basis;
    const month = date
      .toLocaleDateString("en-US", { month: "short" })
      .toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    if (uniqueProjectIdentifier && uniqueProjectIdentifier.trim().length > 0) {
      return `INVOICE-${uniqueProjectIdentifier.trim()}-${month}${year}`;
    } else if (projectName && projectName.trim().length > 0) {
      const firstFourLetters = (projectName || "")
        .replace(/[^A-Za-z]/g, "")
        .substring(0, 4)
        .toUpperCase();
      return `INVOICE-${firstFourLetters}-${month}${year}`;
    }
    return `INVOICE-${month}${year}`;
  }




  

  if (!displayData) return null;
  
  // Pagination logic
  const getEmployeePages = () => {
    const employees = displayData.employees || [];
    const pages = [];

    // First page employees
    const firstPageEmployees = employees.slice(0, EMPLOYEES_PER_FIRST_PAGE);
    if (firstPageEmployees.length > 0) {
      pages.push({ employees: firstPageEmployees, isFirstPage: true });
    }

    // Continuation pages
    let remainingEmployees = employees.slice(EMPLOYEES_PER_FIRST_PAGE);
    while (remainingEmployees.length > 0) {
      const pageEmployees = remainingEmployees.slice(
        0,
        EMPLOYEES_PER_CONTINUATION_PAGE,
      );
      pages.push({ employees: pageEmployees, isFirstPage: false });
      remainingEmployees = remainingEmployees.slice(
        EMPLOYEES_PER_CONTINUATION_PAGE,
      );
    }

    return pages.length > 0 ? pages : [{ employees: [], isFirstPage: true }];
  };

  const employeePages = getEmployeePages();

  // Header component
  const InvoiceHeader = () => (
    <div className="relative">
      {/* Orange diagonal section */}
      <div className="absolute top-0 left-0 w-full h-24">
        <div className="absolute top-0 right-0 w-full h-4 bg-gray-600 z-10"></div>
        <div className="mx-auto h-0 w-[200px] absolute border-r-[50px] border-b-[40px] border-t-[40px] border-l-[0px] border-solid border-r-transparent border-l-transparent border-b-transparent border-t-primary z-10"></div>
        <div
          className="mx-auto h-0 w-[270px] absolute border-r-[50px] border-b-[50px] border-t-[40px] border-l-[0px] border-solid border-r-transparent border-l-transparent border-t-gray-200 border-b-transparent"
          style={{ borderTopColor: "#d9dbdd" }}
        ></div>
      </div>

      <div className="relative z-10 pt-8 px-8">
        <div className="px-1 flex items-start justify-between">
          <div className="mt-4">
            <CompanyLogo className="h-16 object-contain" />
          </div>

          {/* Company Details */}
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-600 mb-2 uppercase">
              {company?.name || 'Company Name'}
            </h1>
            <div className="text-sm text-gray-600 space-y-1">
              {company?.address && (
                <div className="flex justify-end items-start gap-2">
                  <span className="max-w-[340px] break-words text-right block">
                    <span className="text-primary font-semibold">Address:</span>{' '}{company.address}
                  </span>
                </div>
              )}
              {company?.cinNumber && (
                <div className="mt-2">
                  <span className="text-primary font-semibold">CIN:</span>{' '}
                  {company.cinNumber}
                </div>
              )}
              {company?.gstNumber && (
                <div>
                  <span className="text-primary font-semibold">GST:</span>{' '}
                  {company.gstNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const genericUploadsRaw = (displayData as unknown as { genericExcelUploads?: unknown[] })?.genericExcelUploads;
  const genericUploads = Array.isArray(genericUploadsRaw)
    ? (genericUploadsRaw as unknown[])
        .map((u) => u as { sheetName?: unknown; headers?: unknown; rows?: unknown })
        .map((u) => {
          const headers = Array.isArray(u?.headers)
            ? (u.headers as unknown[]).map((h) => String(h ?? '').trim())
            : null;
          const rows = Array.isArray(u?.rows)
            ? (u.rows as unknown[]).map((r) => (Array.isArray(r) ? (r as unknown[]).map((c) => String(c ?? '').trim()) : []))
            : null;
          return {
            sheetName: String(u?.sheetName ?? '').trim(),
            headers,
            rows,
          };
        })
        .filter((u) => !!u.headers && !!u.rows && (u.headers as string[]).length > 0)
    : [];

  const legacyGenericUpload = (displayData as unknown as { genericExcelUpload?: unknown })?.genericExcelUpload as
    | { sheetName?: unknown }
    | undefined;

  const selectedGenericSheetName = String(
    ((displayData as unknown as { lastImportedTab?: unknown })?.lastImportedTab ??
      legacyGenericUpload?.sheetName ??
      '') as unknown,
  ).trim();

  const selectedGenericUploads = (() => {
    if (genericUploads.length === 0) return [];
    // For hidden renderers (PDF export), ensure we always show the first available sheet
    if (selectedGenericSheetName) {
      const matches = genericUploads.filter((u) => (u.sheetName || '').trim() === selectedGenericSheetName);
      if (matches.length > 0) return matches;
    }
    // Default to first sheet for hidden renderers or when no specific sheet is selected
    return [genericUploads[0]];
  })();

  const hasEmployees = (displayData?.employees || []).length > 0;
  const hasGeneric = !hasEmployees && selectedGenericUploads.length > 0;

  const getGenericPages = () => {
    const pages: Array<{
      genericTables: Array<{ sheetName?: string; headers: string[]; rows: string[][]; serialStart: number }>;
      isFirstPage: boolean;
    }> = [{ genericTables: [], isFirstPage: true }];

    let serialCounter = 0;

    for (const sheet of selectedGenericUploads) {
      const headers = sheet.headers as string[] | null;
      const rows = sheet.rows as string[][] | null;
      if (!headers || !rows) continue;

      const dataRows = rows.filter((r) => !isGenericTotalMetaRow(r));

      // If no data rows but headers exist, still add the table with empty rows
      if (dataRows.length === 0) {
        const currentPage = pages[pages.length - 1];
        currentPage.genericTables.push({
          sheetName: sheet.sheetName,
          headers,
          rows: [],
          serialStart: serialCounter,
        });
        continue;
      }

      let cursor = 0;
      while (cursor < dataRows.length) {
        const currentPage = pages[pages.length - 1];
        const cap = currentPage.isFirstPage ? EMPLOYEES_PER_FIRST_PAGE : EMPLOYEES_PER_CONTINUATION_PAGE;
        const used = currentPage.genericTables.reduce((sum, t) => sum + t.rows.length, 0);
        const remainingCap = cap - used;

        if (remainingCap <= 0) {
          pages.push({ genericTables: [], isFirstPage: false });
          continue;
        }

        const take = Math.min(remainingCap, dataRows.length - cursor);
        const slice = dataRows.slice(cursor, cursor + take);
        currentPage.genericTables.push({
          sheetName: sheet.sheetName,
          headers,
          rows: slice,
          serialStart: serialCounter,
        });
        serialCounter += take;
        cursor += take;
      }
    }

    return pages.length > 0 ? pages : [{ genericTables: [], isFirstPage: true }];
  };

  const pagesToRender = hasGeneric
    ? getGenericPages()
    : employeePages;

  const stripProjectNameColumn = (headers: string[], rows: string[][]): { headers: string[]; rows: string[][] } => {
    return { headers, rows };
  };

  const computeGenericTotal = (): number => {
    if (selectedGenericUploads.length === 0) return 0;
    return selectedGenericUploads.reduce((sumSheets, sheet) => {
      const headers = sheet.headers as string[] | null;
      const rows = sheet.rows as string[][] | null;
      if (!headers || !rows) return sumSheets;
      const stripped = stripProjectNameColumn(headers, rows);

      const meta = stripped.rows.find((r) => isGenericTotalMetaRow(r));
      if (meta) {
        const raw = String(meta?.[1] ?? '').trim();
        const n = parseNumericCell(raw);
        if (Number.isFinite(n)) return sumSheets + n;
      }

      const normalizedHeaders = stripped.headers.map((h) => normalizeHeader(h));
      const rateIdx = normalizedHeaders.findIndex((h) => h === 'rateperhour' || h === 'ratehour' || h === 'rateperhr');
      const hoursIdx = normalizedHeaders.findIndex((h) => h === 'hours' || h === 'hour');
      if (rateIdx === -1 || hoursIdx === -1) return sumSheets;

      const dataRows = stripped.rows.filter((r) => !isGenericTotalMetaRow(r));
      const sheetSum = dataRows.reduce((sum, r) => {
        const rate = parseNumericCell(r[rateIdx]);
        const hours = parseNumericCell(r[hoursIdx]);
        return sum + rate * hours;
      }, 0);
      return sumSheets + sheetSum;
    }, 0);
  };

  const GenericExcelTable = ({
    sheetName = 'default',
    headers,
    rows,
    serialStart = 0,
    showTotal = false,
  }: {
    sheetName?: string;
    headers: string[];
    rows: string[][];
    serialStart?: number;
    showTotal?: boolean;
  }) => {
    const stripped = stripProjectNameColumn(headers, rows);
    const dataRows = stripped.rows.filter((r) => !isGenericTotalMetaRow(r));

    const normalizedHeaders = stripped.headers.map((h) => normalizeHeader(h));
    const rateIdx = normalizedHeaders.findIndex((h) => h === 'rateperhour' || h === 'ratehour' || h === 'rateperhr');
    const hoursIdx = normalizedHeaders.findIndex((h) => h === 'hours' || h === 'hour');
    const canComputeTotal = false;

    const headerCells = [...stripped.headers];

    const isNumericCell = (val: unknown): boolean => {
      const raw = String(val ?? '').trim();
      if (!raw) return false;
      const cleaned = raw.replace(/[^0-9,.-]/g, '');
      if (!cleaned) return false;
      const n = parseNumericCell(raw);
      if (!Number.isFinite(n)) return false;
      const hasDigit = /\d/.test(cleaned);
      if (!hasDigit) return false;
      const onlyNumericChars = /^-?[0-9]+(\.[0-9]+)?$/.test(cleaned.replace(/,/g, ''));
      return onlyNumericChars;
    };

    const numericColumns = (() => {
      const sampleRows = dataRows.slice(0, 50);
      return headerCells.map((_, colIdx) => {
        if (canComputeTotal && colIdx === headerCells.length - 1 && headerCells[colIdx] === 'Total') return true;
        if (canComputeTotal && colIdx === rateIdx) return true;
        if (canComputeTotal && colIdx === hoursIdx) return true;

        let filled = 0;
        let numeric = 0;
        for (const r of sampleRows) {
          const v = r?.[colIdx];
          if (String(v ?? '').trim() === '') continue;
          filled += 1;
          if (isNumericCell(v)) numeric += 1;
        }

        if (filled === 0) return false;
        return numeric / filled >= 0.8;
      });
    })();

    // Resizing logic - only allowed when editing a copy project
    const isResizingAllowed = isEditing && !!(displayData as any).isCopy;
    
    // localStorage key for this project's column widths
    const storageKey = `tableColWidths_${displayData?.id || 'default'}_${sheetName}`;
    
    // Load saved column widths from localStorage (only on mount)
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
        const saved = localStorage.getItem(storageKey);
        const savedWidths = saved ? JSON.parse(saved) : {};
        // Initialize both saved and pending states if not already set for this key
        if (!savedColWidths[storageKey]) {
          setSavedColWidths(prev => ({ ...prev, [storageKey]: savedWidths }));
        }
        if (!pendingColWidths[storageKey]) {
          setPendingColWidths(prev => ({ ...prev, [storageKey]: savedWidths }));
        }
      } catch {
        // Ignore errors
      }
    }, [storageKey]);
    
    // Get current column widths from pending state (or empty object if not set)
    const colWidths = pendingColWidths[storageKey] || {};
    
    // Update pending column widths (does NOT save to localStorage)
    const updateColWidth = (colIndex: number, newWidth: number) => {
      const updatedWidths = { ...colWidths, [colIndex]: newWidth };
      setPendingColWidths(prev => ({ ...prev, [storageKey]: updatedWidths }));
    };
    
    const handleMouseDown = (e: React.MouseEvent, colIndex: number) => {
      if (!isResizingAllowed) return;
      e.preventDefault();
      e.stopPropagation();
      
      const resizer = e.target as HTMLElement;
      const headerCell = resizer.parentElement;
      if (!headerCell) return;
      
      resizer.style.background = '#555';
      
      const startX = e.clientX;
      const startWidth = headerCell.getBoundingClientRect().width;
      
      const tableElement = headerCell.parentElement;
      const tableWidth = tableElement ? tableElement.getBoundingClientRect().width : 0;
      
      // Calculate max available width
      // We must subtract S.No width (42px), all gaps (0.5rem = 8px per gap), and other columns
      const sNoColumnWidth = 42;
      const gapSize = 8; // 0.5rem = 8px
      const totalGaps = numericColumns.length; // (1 S.No + N data columns) - 1 = N gaps
      
      let occupiedByOthers = sNoColumnWidth + (totalGaps * gapSize); 
      
      numericColumns.forEach((_, idx) => {
        if (idx === colIndex) return; // Skip current
        if (idx === numericColumns.length - 1) {
          occupiedByOthers += 50; // Last column min width
        } else if (colWidths[idx]) {
          occupiedByOthers += colWidths[idx]; // Other fixed columns
        } else {
          occupiedByOthers += 0; // flexible columns (can shrink to 0)
        }
      });
      
      const maxAllowedWidth = tableWidth - occupiedByOthers;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        if (newWidth > 30 && (maxAllowedWidth <= 0 || newWidth < maxAllowedWidth)) { // Minimum width constraint and Max constraint
          updateColWidth(colIndex, newWidth);
        }
      };
      
      const onMouseUp = () => {
        resizer.style.background = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const gridTemplateColumns = `42px ${numericColumns
      .map((isNum, i) => {
        // Last column must remain flexible to anchor the right side of the table
        if (i === numericColumns.length - 1) return 'minmax(50px, 1fr)';
        if (colWidths[i]) return `${colWidths[i]}px`;
        return 'minmax(0, 1fr)';
      })
      .join(' ')}`;

    return (
      <div className="my-2">
      
        <div className="border border-gray-200">
          <div
            className="bg-primary text-white font-semibold text-xs generic-table-header" 
            style={{
              display: 'grid',
              gridTemplateColumns,
              gap: '0.5rem',
              fontSize: '0.75rem',
              lineHeight: '1rem',
            }}
          >
            <div className="text-left px-1 py-1.5 whitespace-nowrap">
              <div className='generic-thead-text'>
                S.No. 
              </div>
            </div>
            {headerCells.map((h, i) => (
              <div
                key={`${h}-${i}`}
                className={`px-1 py-1.5 break-words ${numericColumns[i] ? 'text-right' : 'text-left'}`}
                style={{ position: 'relative', paddingRight: i === headerCells.length - 1 ? '8px' : undefined }}
              >
                <div className='generic-thead-text'>{h}</div>
                {isResizingAllowed && i !== headerCells.length - 1 && (
                  <div 
                    className="resizer"
                    onMouseDown={(e) => handleMouseDown(e, i)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      height: '100%',
                      width: '5px',
                      background: '#000',
                      cursor: 'col-resize',
                      userSelect: 'none',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {dataRows.map((row, index) => {
            const baseCells = [...row];
            const cells = canComputeTotal && headerCells[headerCells.length - 1] === 'Total'
              ? (() => {
                  const rate = parseNumericCell(row[rateIdx]);
                  const hours = parseNumericCell(row[hoursIdx]);
                  const computedTotal = rate * hours;
                  const computedTotalStr = computedTotal ? computedTotal.toFixed(2) : '0.00';
                  return [...baseCells, computedTotalStr];
                })()
              : baseCells;

            const totalColIdx = canComputeTotal && headerCells[headerCells.length - 1] === 'Total'
              ? headerCells.length - 1
              : -1;

            return (
              <div
                key={index}
                className={`border-b border-gray-200 text-xs generic-table-text  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns,
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  lineHeight: '1rem',
                }}
              >
                <div className="text-center px-1 py-1.5 tabular-nums whitespace-nowrap">{serialStart + index + 1}</div>
                {cells.slice(0, headerCells.length).map((c, i) => (
                  <div
                    key={i}
                    className={`px-1 py-1.5 ${numericColumns[i] ? 'text-right tabular-nums whitespace-nowrap' : 'text-left break-words'}`}
                    style={{ paddingRight: i === headerCells.length - 1 ? '8px' : undefined }}
                  >
                    {i === totalColIdx && totalColIdx !== -1 ? (
                      <span className="flex flex-col sm:flex-row justify-between gap-1">
                        <span>{getCurrencySymbol(displayData.currency)}</span>
                        <span>{formatTotalEmployeeTable(parseNumericCell(c))}</span>
                      </span>
                    ) : (
                      c
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {showTotal && (
            <div
              className="employee-table-text border-t-2 border-gray-300 font-bold text-lg bg-gray-50"
              style={{
                display: 'grid',
                gridTemplateColumns,
                gap: '0.5rem',
              }}
            >
              <div></div>
              <div
                className="text-right px-1.5 py-1.5"
                style={{ gridColumn: `span ${headerCells.length - 1}` }}
              >
                Total:
              </div>
              <div 
                className="flex justify-between px-1.5 py-1.5"
                style={{ paddingRight: '8px' }}
              >
                <span>{getCurrencySymbol(displayData.currency)}</span>
                <span>{formatTotalEmployeeTable(computeGenericTotal())}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Currency account mapping for project's currency (supports decrypted when available)
  const [currencyAccount, setCurrencyAccount] = useState<{
    currency: string;
    last4: string;
    accountNumber?: string;
  } | null>(null);

  // Company info for dynamic bank details
  const [company, setCompany] = useState<Company | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [companyLoading, setCompanyLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [companyError, setCompanyError] = useState<string | null>(null);
  // Controlled popovers for date pickers
  const [invoiceDateOpen, setInvoiceDateOpen] = useState(false);
  const [paymentDueDateOpen, setPaymentDueDateOpen] = useState(false);

  useEffect(() => {
    const cur = normalizeCurrency(displayData.currency);
    if (!cur) {
      setCurrencyAccount(null);
      return;
    }
    let cancelled = false;
    api
      .getCurrencyAccountByCurrency(cur, { decrypted: true })
      .then((res) => {
        if (!cancelled) {
          if (res) {
            setCurrencyAccount({
              currency: res.currency,
              last4: res.last4,
              accountNumber: res.accountNumber,
            });
          } else {
            setCurrencyAccount(null);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setCurrencyAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [displayData.currency]);

  // Load company details
  useEffect(() => {
    // If parent provided company, use it and skip API call
    if (companyOverride !== undefined) {
      setCompany(companyOverride || null);
      setCompanyLoading(false);
      setCompanyError(null);
      return;
    }

    let cancelled = false;
    setCompanyLoading(true);
    setCompanyError(null);
    // Prefer explicit owner userId from project/user
    const ownerUserId = displayData?.userId || displayData?.user?.id;
    api
      .getCompany(ownerUserId)
      .then((c) => {
        if (!cancelled) setCompany(c || null);
      })
      .catch((e) => {
        if (!cancelled) setCompanyError((e as Error).message || 'Failed to load company');
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyOverride, displayData?.userId, displayData?.user?.id]);

  // Footer component
  const InvoiceFooter = () => (
    <div className="mt-auto left-0 right-0 relative">
      <div className="relative">
        <div
          className="absolute h-0 right-0 mx-auto bottom-0 float-end w-[600px] border-l-[50px] border-b-[52px] border-solid border-r-transparent border-l-transparent border-t-gray-200 border-b-transparent"
          style={{ borderBottomColor: "#d9dbdd" }}
        >
          <div className="footer-text-phone">Ph: +918080466754</div>
        </div>
        <div className="absolute h-0 right-0 mx-auto bottom-0 float-end w-[430px] border-l-[50px] border-b-[52px] border-solid z-10 border-r-transparent border-l-transparent border-t-gray-200 border-b-primary text-white d-flex">
          <div className="footer-comp-info">
            <span className="mx-2">Email: info@kizora.com</span>{" "}
            <span className="mx-2">website: www.kizora.com</span>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-full h-5 bg-gray-600"></div>
      </div>
    </div>
  );

  // Employee table component
  const EmployeeTable = ({
    employees,
    pageIndex,
    showTotal = false,
  }: {
    employees: Employee[];
    pageIndex: number;
    showTotal?: boolean;
  }) => (
    <div className="my-2">
      <div className="border border-gray-200 overflow-hidden">
        <div 
          className="employee-table-text bg-primary text-white font-semibold text-xs"
          style={{ gridTemplateColumns: '40px 1.5fr 90px 70px 100px' }}
        >
          <div className="table-head text-left px-1 py-1.5">S.No.</div>
          <div className="table-head text-left px-1 py-1.5">Name</div>
          <div className="table-head text-right px-1 py-1.5">
            {getCurrencySymbol(displayData.currency)}/ph
          </div>
          <div className="table-head text-right px-1 py-1.5">Hours</div>
          <div className="table-head text-right ps-1 pe-2 py-1.5">Total</div>
        </div>

        {employees.map((employee, index) => {
          const globalIndex =
            pageIndex === 0
              ? index
              : EMPLOYEES_PER_FIRST_PAGE +
                (pageIndex - 1) * EMPLOYEES_PER_CONTINUATION_PAGE +
                index;
          return (
            <div
              key={employee.id}
              className={`border-b border-gray-200 employee-table-text gap-0 text-xs ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              style={{ gridTemplateColumns: '40px 1.5fr 90px 70px 100px' }}
            >
              <div className="text-center px-1 py-1.5">{globalIndex + 1}</div>
              <div className="text-left px-1 py-1.5">
                {/* {isEditing ? (
                  <Input
                    value={employee.name}
                    onChange={(e) => handleEmployeeChange(employee.id, 'name', e.target.value)}
                    className="text-xs p-1 h-6"
                  />
                ) : (
                  employee.name
                )} */}
                {employee.name}
              </div>
              <div className="text-right px-1 py-1.5">
                {/* {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={employee.ratePerHour}
                    onChange={(e) => handleEmployeeChange(employee.id, 'ratePerHour', parseFloat(e.target.value) || 0)}
                    className="text-xs p-1 h-6"
                  />
                ) : (
                  employee.ratePerHour.toFixed(2)
                )} */}
                {employee.ratePerHour.toFixed(2)}
              </div>
              <div className="text-right px-1 py-1.5">
                {/* {isEditing ? (
                  <Input
                    type="number"
                    value={employee.hours}
                    onChange={(e) => handleEmployeeChange(employee.id, 'hours', parseInt(e.target.value) || 0)}
                    className="text-xs p-1 h-6"
                  />
                ) : (
                  employee.hours
                )} */}
                {employee.hours}
              </div>
              <div className="ps-1 pe-2 py-1.5 flex justify-between">
                <span className="tabular-nums">
                  {getCurrencySymbol(displayData.currency)}
                </span>
                <span className="tabular-nums">
                  {formatTotalEmployeeTable(
                    employee.total,
                  )}
                </span>
              </div>
            </div>
          );
        })}

        {showTotal && (
          <div 
            className="employee-table-text border-t-2 border-gray-300 font-bold text-lg bg-gray-50"
            style={{ gridTemplateColumns: '40px 1.5fr 90px 70px 100px' }}
          >
            <div></div>
            <div></div>
            <div></div>
            <div className="text-right px-1.5 py-1.5">Total:</div>
            <div className="flex justify-between px-1.5 py-1.5">
              <span>
                {getCurrencySymbol(displayData.currency)}
              </span>
              <span>
                {formatTotalEmployeeTable(
                  (displayData?.employees || []).reduce((sum, emp) => sum + emp.total, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            box-shadow: none;
            border: none;
          }
          .work-period-badge {
            display: inline-block !important;
            padding: 2px 8px !important;
            border-radius: 9999px !important;
            font-weight: 600 !important;
            font-size: 12px !important;
            line-height: 16px !important;
          }
          .footer-text-phone{
            margin: 0.5rem;
            font-size: smaller;
          }
          .footer-comp-info{
            display: flex;
            align-items: center;
            font-size: smaller;
            margin-top: 0rem;
          }
          .employee-table-text{
            // padding-left: 0.5rem;
            // padding-right: 0.5rem;
            // padding-top: 0.25rem;
            // padding-bottom: 0.25rem;
            display: grid;
            gap: 0.5rem;
            font-size: 0.75rem;
            line-height: 1rem;
          }
          .employee-table-text > div:not(:last-child) {
            // border-right: 1px solid #e5e7eb;
            padding-right: 0.5rem;
          }
        }
        
        @media print {
          .a4-page {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            box-shadow: none;
            overflow: hidden;
            position: relative;
          }
          
          .a4-content {
            height: calc(297mm - 140px); /* Account for header and footer space */
            overflow: hidden;
          }
          
          /* Ensure footer is positioned at bottom */
          .mt-auto {
            margin-top: auto !important;
          }
          
          /* Compact table further in print */
          .employee-table-text {
            line-height: 0.875rem !important;
            font-size: 0.7rem !important;
          }
          .generic-table-text > div:not(:last-child) {
            border-right: 1px solid #e5e7eb;
            padding-right: 0.5rem;
          }
        }
        
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .a4-content{
            padding: 0 10mm 0 10mm;
          }
        .work-period-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 9999px;
          // background-color: #fff7ed;
          // color: #c2410c;
          // border: 1px solid #fed7aa;
          font-weight: 600;
          font-size: 12px;
          line-height: 16px;
        }
        .footer-text-phone{
          margin: 0.5rem;
          font-size: smaller;
        }
        .footer-comp-info{
          display: flex;
          align-items: center;
          font-size: smaller;
          margin-top: 1rem;
        }
        .employee-table-text{
          // padding-left: 0.5rem;
          // padding-right: 0.5rem;
          // padding-top: 0.25rem;
          // padding-bottom: 0.25rem;
          display: grid;
          gap: 0.5rem;
          font-size: 0.75rem;
          line-height: 1rem;
        }

        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 5px;
          cursor: col-resize;
          user-select: none;
          touch-action: none;
          z-index: 10;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .generic-table-header > div {
          position: relative;
        }

        .generic-table-header > div:hover .resizer, .resizer.resizing {
          opacity: 1;
          background: #9ca3af; /* gray-400 */
        }
        .employee-table-text > div:not(:last-child) {
          border-right: 1px solid #e5e7eb;
          padding-right: 0.5rem;
        }
        .generic-table-text > div:not(:last-child) {
          border-right: 1px solid #e5e7eb;
          padding-right: 0.5rem;
        }
        .generic-table-header > div:not(:last-child) {
          border-right: 1px solid #e5e7eb;
          padding-right: 0.5rem;
        }
      `}</style>

      {/* Invoice Pages */}
      <div id={containerId ?? "invoice-container"} className="space-y-8">
        {/* Employee Pages */}
        {pagesToRender.map((page, pageIndex) => (
          <div
            key={`employee-page-${pageIndex}`}
            className={`a4-page ${pageIndex > 0 ? "print-break" : ""}`}
          >
            <Card
              className="bg-white h-full flex flex-col border-0 print:shadow-none print:rounded-none"
              style={{
                ...(isEditing ? { minHeight: "297mm", height: "auto" } : {
                  minHeight: "297mm",
                  maxHeight: "297mm",
                  height: "297mm"
                })
              }}
            >
              <InvoiceHeader />
              <hr className="border-gray-200 mt-3" />

              <CardContent className="flex-1 a4-content">
                {/* First page content */}
                {page.isFirstPage && (
                  <>
                    {/* Invoice Title */}
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 my-2">
                        Customer Invoice (Electronic)
                      </h2>
                    </div>

                    {/* Customer and Invoice Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className={ isEditing ? `space-y-2` : `space-y-1` }>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Customer:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData.customerName}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("customerName", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('customerName')}
                                className={`text-sm ${errors.customerName ? 'border-red-500 focus:border-red-500' : ''}`}
                              />
                              {errors.customerName && (
                                <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.customerName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Address:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <textarea
                                value={displayData.customerAddress}
                                onChange={(e) =>
                                  handleInputChangeWithValidation(
                                    "customerAddress",
                                    e.target.value,
                                  )
                                }
                                onBlur={() => handleFieldBlur('customerAddress')}
                                className={`w-full p-2 border rounded-md resize-none text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.customerAddress ? 'border-red-500 focus:border-red-500' : ''}`}
                                rows={2}
                              />
                              {errors.customerAddress && (
                                <p className="text-red-500 text-xs mt-1">{errors.customerAddress}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.customerAddress}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Person:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData.contactPerson}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("contactPerson", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('contactPerson')}
                                className={`text-sm ${errors.contactPerson ? 'border-red-500 focus:border-red-500' : ''}`}
                              />
                              {errors.contactPerson && (
                                <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.contactPerson}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Email:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData.email}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("email", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('email')}
                                className={`text-sm ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                              />
                              {errors.email && (
                                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Phone:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData.phoneNumber || ""}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("phoneNumber", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('phoneNumber')}
                                className={`text-sm ${errors.phoneNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                                placeholder="Phone Number"
                              />
                              {errors.phoneNumber && (
                                <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.phoneNumber || "-"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            {displayData.taxIdentificationType === 'FISCAL_ID' ? 'Fiscal ID' : 'VAT Number'}:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                type="text"
                                value={displayData.taxNumber || ''}
                                onChange={(e) => {
                                  handleInputChangeWithValidation("taxNumber", e.target.value);
                                }}
                                onBlur={() => handleFieldBlur('taxNumber')}
                                className={`text-sm ${errors.taxNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                                placeholder={displayData.taxIdentificationType === 'FISCAL_ID' ? 'e.g., 123456789' : 'e.g., GB123456789'}
                              />
                              {errors.taxNumber && (
                                <p className="text-red-500 text-xs mt-1">{errors.taxNumber}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.taxNumber || '-'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-2"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Work Period:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <div className="flex gap-2">
                                <Select
                                  value={(displayData?.workPeriod || '').split(" ")[0] || ''}
                                  onValueChange={(month) => {
                                    const year =
                                      (displayData?.workPeriod || '').split(" ")[1] ||
                                      new Date().getFullYear().toString();
                                    const newWorkPeriod = `${month} ${year}`;
                                    onInputChange?.("workPeriod", newWorkPeriod);
                                  }}
                                >
                                  <SelectTrigger className="flex-1 focus-visible:outline-none focus:none focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="Month" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="January">
                                      January
                                    </SelectItem>
                                  <SelectItem value="February">
                                    February
                                  </SelectItem>
                                  <SelectItem value="March">March</SelectItem>
                                  <SelectItem value="April">April</SelectItem>
                                  <SelectItem value="May">May</SelectItem>
                                  <SelectItem value="June">June</SelectItem>
                                  <SelectItem value="July">July</SelectItem>
                                  <SelectItem value="August">August</SelectItem>
                                  <SelectItem value="September">
                                    September
                                  </SelectItem>
                                  <SelectItem value="October">
                                    October
                                  </SelectItem>
                                  <SelectItem value="November">
                                    November
                                  </SelectItem>
                                  <SelectItem value="December">
                                    December
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={
                                  (displayData?.workPeriod || '').split(" ")[1] ||
                                  new Date().getFullYear().toString()
                                }
                                onValueChange={(year) => {
                                  const month =
                                    (displayData?.workPeriod || '').split(" ")[0] ||
                                    "January";
                                  const newWorkPeriod = `${month} ${year}`;
                                  onInputChange?.("workPeriod", newWorkPeriod);
                                }}
                              >
                                <SelectTrigger className="w-24 focus-visible:outline-none focus:none focus:ring-0 focus:ring-offset-0">
                                  <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from(
                                    { length: 10 },
                                    (_, i) => new Date().getFullYear() - 5 + i,
                                  ).map((year) => (
                                    <SelectItem
                                      key={year}
                                      value={year.toString()}
                                    >
                                      {year}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              </div>
                            </div>
                          ) : (
                            <span className="work-period-badge inline-block px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs border-green-500 bg-green-50 text-green-700"
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontWeight: "700",
                              fontSize: "12px",
                              lineHeight: "16px",
                            }}>
                              {(() => {
                                const storedFields = loadDynamicFieldsFromStorage(displayData?.id);
                                if (storedFields?.workPeriod) {
                                  return storedFields.workPeriod;
                                }
                                return displayData?.workPeriod || getMonthYearFromYMD(effectiveInvoiceDateStr);
                              })()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={ isEditing ? `space-y-2` : `space-y-1` }>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Invoice Number:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData?.invoiceNumber || ''}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("invoiceNumber", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('invoiceNumber')}
                                className={`text-sm ${errors.invoiceNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                              />
                              {errors.invoiceNumber && (
                                <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {(() => {
                                const storedFields = loadDynamicFieldsFromStorage(displayData?.id);
                                if (storedFields?.invoiceNumber) {
                                  return storedFields.invoiceNumber;
                                }
                                // Prefer workPeriod for invoice number month/year; fallback to effective invoice date
                                const baseYmdFromWP = workPeriodToYMD(displayData?.workPeriod || undefined);
                                return generateInvoiceNumber(
                                  displayData?.uniqueProjectIdentifier,
                                  displayData?.name,
                                  baseYmdFromWP || (displayData?.invoiceDate || effectiveInvoiceDateStr),
                                );
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2 "
                            }
                          >
                            Invoice Date:
                          </Label>
                          {isEditing ? (
                            <Popover open={invoiceDateOpen} onOpenChange={setInvoiceDateOpen}>
                              <PopoverTrigger asChild>
                                {(() => {
                                  const baseDateStr = String(displayData?.invoiceDate || displayData?.lastImportedInvoiceDate || effectiveInvoiceDateStr);
                                  return (
                                <Button
                                  variant="outline"
                                  className="justify-start text-left font-normal text-sm flex-1 hover:bg-trasparent"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(
                                    new Date(baseDateStr),
                                    "PPP",
                                  )}
                                </Button>
                                  );
                                })()}
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="end"
                              >
                                {(() => {
                                  const baseDateStr = String(displayData?.invoiceDate || displayData?.lastImportedInvoiceDate || effectiveInvoiceDateStr);
                                  return (
                                <Calendar
                                  mode="single"
                                  selected={new Date(baseDateStr)}
                                  onSelect={(date) => {
                                    if (date) {
                                      const formattedDate = format(
                                        date,
                                        "yyyy-MM-dd",
                                      );
                                      const settings = getProjectSettings();
                                      onInputChange?.("invoiceDate", formattedDate);
                                      onInputChange?.("paymentDueDate", getPaymentDueDate(
                                        formattedDate,
                                        settings.paymentDurationDays,
                                      ));
                                      setInvoiceDateOpen(false);
                                    }
                                  }}
                                  initialFocus
                                />
                                  );
                                })()}
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {format(
                                new Date(displayData?.invoiceDate || effectiveInvoiceDateStr),
                                "PPP",
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3 min-w-fit"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Payment Due Date:
                          </Label>
                          {isEditing ? (
                            <Popover open={paymentDueDateOpen} onOpenChange={setPaymentDueDateOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="justify-start text-left font-normal text-sm flex-1 hover:bg-trasparent"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(
                                    new Date(
                                      displayData?.paymentDueDate ||
                                      getPaymentDueDate(displayData?.invoiceDate || effectiveInvoiceDateStr)
                                    ),
                                    "PPP",
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="end"
                              >
                                <Calendar
                                  mode="single"
                                  selected={
                                    new Date(
                                      displayData?.paymentDueDate ||
                                      getPaymentDueDate(displayData?.invoiceDate || effectiveInvoiceDateStr)
                                    )
                                  }
                                  onSelect={(date) => {
                                    if (date) {
                                      onInputChange?.("paymentDueDate", format(
                                        date,
                                        "yyyy-MM-dd",
                                      ));
                                      setPaymentDueDateOpen(false);
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {(() => {
                                const storedFields = loadDynamicFieldsFromStorage(displayData?.id);
                                if (storedFields?.paymentDueDate) {
                                  return format(new Date(storedFields.paymentDueDate), "PPP");
                                }
                                const paymentDueDate = displayData?.paymentDueDate || getPaymentDueDate(effectiveInvoiceDateStr);
                                return format(new Date(paymentDueDate), "PPP");
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            Invoice Amount:
                          </Label>
                          {isEditing ? (
                            <Input
                            value={formatCurrency(
                              hasGeneric
                                ? computeGenericTotal()
                                : (displayData?.employees || []).reduce((sum, emp) => sum + emp.total, 0),
                              displayData.currency,
                            )}
                              readOnly
                              className="text-sm flex-1"
                              placeholder="Purchase Order Number"
                            />
                          ) : (
                            <span className="text-green-700 flex-1 font-bold">
                              {formatCurrency(
                                hasGeneric
                                  ? computeGenericTotal()
                                  : (displayData?.employees || []).reduce((sum, emp) => sum + emp.total, 0),
                                displayData.currency,
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            { displayData.agreementType === "SOW" ? "SOW REF:" : "MSA:" }
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData.agreementRef}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("agreementRef", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('agreementRef')}
                                className={`text-sm ${errors.agreementRef ? 'border-red-500 focus:border-red-500' : ''}`}
                                placeholder={displayData?.agreementType === 'MSA' ? 'MSA Reference' : 'SOW Reference'}
                              />
                              {errors.agreementRef && (
                                <p className="text-red-500 text-xs mt-1">{errors.agreementRef}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.agreementRef}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Label
                            className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }
                          >
                            PO Number:
                          </Label>
                          {isEditing ? (
                            <Input
                              value={displayData.poNumber || ""}
                              onChange={(e) =>
                                onInputChange?.("poNumber", e.target.value)
                              }
                              className="text-sm flex-1"
                              placeholder="Purchase Order Number"
                            />
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.poNumber || "-"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* <div className={isEditing ? "grid grid-cols-1 gap-6 text-sm mt-2" : "grid grid-cols-1 gap-6 text-sm mt-1"}>
                      <div className={isEditing ? `space-y-2` : `space-y-1`}>
                        <div className="flex items-start gap-2">
                          <Label className={
                              isEditing
                                ? "leading-none mt-3"
                                : "font-semibold min-w-fit leading-5 mb-2"
                            }>
                            Invoice Purpose:
                          </Label>
                          {isEditing ? (
                            <div className="flex-1">
                              <Input
                                value={displayData.invoicePurpose || ""}
                                onChange={(e) =>
                                  handleInputChangeWithValidation("invoicePurpose", e.target.value)
                                }
                                onBlur={() => handleFieldBlur('invoicePurpose')}
                                className="text-sm flex-1"
                                placeholder="Enter invoice purpose"
                              />
                              {errors.invoicePurpose && (
                                <p className="text-red-500 text-xs mt-1">{errors.invoicePurpose}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 flex-1">
                              {displayData.invoicePurpose || "-"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div> */}

                    {/* {isEditing && (
                      <div className="mb-4 no-print">
                        <Button onClick={handleAddEmployee} variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Employee
                        </Button>
                      </div>
                    )} */}
                  </>
                )}

                {/* Continuation page header */}
                {!page.isFirstPage && (
                  <div className="text-center my-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Employee Details (Continued) - Page {pageIndex + 1}
                    </h2>
                  </div>
                )}

                {/* Employee Table */}
                {hasGeneric ? (
                  <div>
                    {'genericTables' in page &&
                      page.genericTables.map((t, idx) => (
                        <GenericExcelTable
                          key={`${t.sheetName || 'sheet'}-${pageIndex}-${idx}`}
                          sheetName={t.sheetName}
                          headers={t.headers}
                          rows={t.rows}
                          serialStart={t.serialStart}
                          showTotal={pageIndex === pagesToRender.length - 1 && idx === page.genericTables.length - 1}
                        />
                      ))}
                  </div>
                ) : (
                  <EmployeeTable
                    employees={'employees' in page ? page.employees : []}
                    pageIndex={pageIndex}
                    showTotal={pageIndex === pagesToRender.length - 1}
                  />
                )}

                {/* Total Invoice Amount - Only on last employee page */}
                {pageIndex === pagesToRender.length - 1 && (
                  <div className="text-right mt-1">
                    <div className="text-lg font-bold text-green-700" style={{ lineHeight: '1.2' }}>
                      Total Invoice Amount:{" "}
                      {formatCurrency(
                        hasGeneric
                          ? computeGenericTotal()
                          : (displayData?.employees || []).reduce((sum, emp) => sum + emp.total, 0),
                        displayData.currency,
                      )}
                    </div>
                    <div className="text-gray-500 text-sm font-bold">
                      Wire transfer charges to be borne by payer
                    </div>
                  </div>
                )}
              </CardContent>
              {/* Show wire transfer message only on the last employee page (second-to-last page overall) */}
              {pageIndex === pagesToRender.length - 1 ? (
                  <div className="mt-4 text-center text-sm" style={{marginBottom: '64px'}}>
Electronic wire transfer details for payment on next page
                  </div>
                ) : (
                  <div className="mt-4 text-center text-sm continuation-message" style={{marginBottom: '64px'}}>
The table continues on the next page
                  </div>
                )}
              <InvoiceFooter />
            </Card>
          </div>
        ))}

        {/* Bank Details Page - Always last */}
        <div className="a4-page print-break">
          <Card
            className="bg-white h-full flex flex-col border-0 print:shadow-none print:rounded-none"
            style={{ 
              minHeight: "297mm",
              maxHeight: "297mm",
              height: "297mm"
            }}
          >
            <InvoiceHeader />
            <hr className="border-gray-200 mt-3" />

            <CardContent className="flex-1 a4-content">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 my-2">
                Bank Details for Wire Transfer
                </h2>
              </div>

              <div className="space-y-1 text-sm text-gray-800">
                {(() => {
                  const currencyCode = normalizeCurrency(displayData.currency);
                  const accountNo = currencyAccount
                    ? (currencyAccount.accountNumber ?? `XXXXX${currencyAccount.last4}`)
                    : "";
                  const beneficiaryName = company?.name || "";
                  const beneficiaryAddress = company?.address || "";
                  const beneficiaryBankName = company?.bankName || "";
                  const beneficiaryBankAddress = company?.bankAddress || "";
                  const beneficiarySwift = company?.swiftCode || "";
                  return (
                    <>
                      <p className="text-sm font-bold mb-8">
                        Note: Wire transfer charges to be borne by payer
                      </p>
                      <div className="my-1">
                        <span className="font-bold">Beneficiary name:</span>{" "}
                        <span>{beneficiaryName || "—"}</span>
                      </div>
                      <div className="my-1">
                        <span className="font-bold">Bank Account No:</span>{" "}
                        <span>{accountNo || "—"}</span>
                      </div>
                      <div className="my-1">
                        <span className="font-bold">Currency:</span>{" "}
                        <span>{currencyCode || "—"}</span>
                      </div>
                      <div className="my-1">
                        <span className="font-bold">IFSC Code:</span>{" "}
                        <span>{company?.ifscCode || "—"}</span>
                      </div>

                      <div className="my-1">
                        <span className="font-bold">Beneficiary&apos;s (Name and address):</span>
                        <div className="my-1">
                          <span className="ml-10 font-bold">Name:</span>{" "}
                          <span>{beneficiaryName || "—"}</span>
                        </div>
                        <div className="my-1">
                          <span className="ml-10 font-bold">Address:</span>{" "}
                          <span>{beneficiaryAddress || "—"}</span>
                        </div>
                      </div>

                      <div className="my-1">
                        <span className="font-bold">Beneficiary&apos;s bank (Name and address):</span>
                        <div className="ml-10">{beneficiaryBankName || "—"}</div>
                        {beneficiaryBankAddress && (
                          <div className="ml-10">{beneficiaryBankAddress}</div>
                        )}
                      </div>
                      <div className="my-1">
                        <span className="font-bold">Beneficiary&apos;s bank SWIFT Code:</span>{" "}
                        <span>{beneficiarySwift || "—"}</span>
                      </div>
                    </>
                  );
                })()}

                {company && (company.remittingBankName || company.remittingAccountNo || company.remittingSwiftCode || company.remittingIbanNo || company.remittingAbaFedNo) && (
                  <div className="my-10">
                    <div className="font-bold mt-8">Additional Information for Remitting Bank:</div>
                    {company.remittingBankName && (
                      <div className="my-1">
                        <span className="font-bold">NAME OF BANK:</span>
                        <span> {company.remittingBankName} </span>
                      </div>
                    )}
                    <div className="my-1">
                      <span className="font-bold">Currency:</span>
                      <span> {(company.remittingCurrency || displayData.currency || "").toUpperCase() || "—"}</span>
                    </div>
                    {company.remittingAccountNo && (
                      <div className="my-1">
                        <span className="font-bold">A/C NO:</span>
                        <span> {company.remittingAccountNo}</span>
                      </div>
                    )}
                    {company.remittingSwiftCode && (
                      <div className="my-1">
                        <span className="font-bold">Swift Code:</span>{" "}
                        <span> {company.remittingSwiftCode}</span>
                      </div>
                    )}
                    {company.remittingIbanNo && (
                      <div className="my-1">
                        <span className="font-bold">IBAN NO:</span>{" "}
                        <span> {company.remittingIbanNo}</span>
                      </div>
                    )}
                    {company.remittingAbaFedNo && (
                      <div className="my-1">
                        <span className="font-bold">ABA FED No:</span>{" "}
                        <span> {company.remittingAbaFedNo}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Signature / Stamp and Signatory Section */}
                {includeSignature && company && (company.signatureImage || company.companyStampImage || company.signatoryName || company.signatoryDesignation) && (
                  <div className="mt-16 flex flex-col items-center signing-block">
                    {/* Stamp */}
                    {company.companyStampImage && (
                      <div className="mt-6 w-56 flex items-center justify-center">
                        <img
                          src={company.companyStampImage}
                          alt="Company stamp"
                          className="h-28 w-28 object-contain"
                        />
                      </div>
                    )}
                    {/* Space between stamp and signature */}
                    {/* {company.companyStampImage && company.signatureImage && (
                      <div className="h-1" />
                    )} */}
                    {/* Signature */}
                    {company.signatureImage && (
                      <div className="w-56 flex items-center justify-center">
                        <img
                          src={company.signatureImage}
                          alt="Authorized signature"
                          className="h-16 w-auto object-contain mix-blend-multiply"
                        />
                      </div>
                    )}
                    {(company.signatoryName || company.signatoryDesignation) && (
                      <div className="mt-2 text-center font-bold">
                        <span>
                          {company.signatoryName || ""}
                          {company.signatoryDesignation ? `, ${company.signatoryDesignation}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <InvoiceFooter />
          </Card>
        </div>
      </div>
    </div>
  );
}
