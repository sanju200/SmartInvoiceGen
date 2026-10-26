
import  React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, X, Download } from 'lucide-react';import { useProject, useUpdateProject } from '../hooks/useProjects';
import SimpleTemplateRenderer, { ProjectWithTemplateFields } from '../components/templates/SimpleTemplateRenderer';
import { useTemplate } from '../contexts/TemplateContext';
import { exportInvoiceToPDF } from '@/lib/pdfExport';
import { toast } from '@/hooks/use-toast';

export default function Preview() {
  const { id } = useParams();
  const { data: project, isLoading, error } = useProject(id || '');
  const updateProjectMutation = useUpdateProject();
  const { selectedTemplate } = useTemplate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ProjectWithTemplateFields | null>(null);
  const [isExporting, setIsExporting] = useState({
    regular: false,
    signed: false
  });
  const [isFormValid, setIsFormValid] = useState(true);
  // Control whether signature/stamp is rendered in the template (affects export)
  const [includeSignature, setIncludeSignature] = useState(true);
  // Column width actions from SimpleTemplateRenderer
  const [columnWidthActions, setColumnWidthActions] = useState<{ save: () => void; reset: () => void } | null>(null);

  const convertDateForInput = (dateString: string): string => {
    // If no date string provided, return today's date
    if (!dateString || dateString.trim() === '') {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's already in YYYY-MM-DD format, return as is
    if (dateString.includes('-') && dateString.length === 10) {
      return dateString;
    }
    
    // If it's in DD/MM/YY format, convert it
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    
    // If we can't parse it, return today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formats a Date|string to YYYY-MM-DD; returns '' if invalid
  const toYMD = (val?: Date | string | null): string => {
    if (!val) return '';
    try {
      const d = new Date(val as unknown as string);
      if (isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return '';
    }
  };

  // Choose the same base invoice date used in preview mode
  const getInitialInvoiceDate = (): string => {
    // Prefer explicit project.invoiceDate; else lastImportedInvoiceDate; else today
    const fromProject = convertDateForInput(project?.invoiceDate as string);
    if (project?.invoiceDate && fromProject) return fromProject;
    const fromImported = toYMD(project?.lastImportedInvoiceDate || null);
    if (fromImported) return fromImported;
    return convertDateForInput('');
  };

  const getPaymentDueDate = (invoiceDate: string, paymentDueDays?: number): string => {
    const date = new Date(invoiceDate);
    const duration = paymentDueDays || 15; // Default to 15 days if not specified
    date.setDate(date.getDate() + duration);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Clear localStorage dynamic fields on component mount (page refresh/navigation)
  useEffect(() => {
    if (project) {
      const key = `dynamicFields_${project.id}`;
      localStorage.removeItem(key);
    }
  }, [project?.id]);

  useEffect(() => {
    if (project && !isEditing) {
      const defaultProject: ProjectWithTemplateFields = {
        ...project,
        phoneNumber: project.phoneNumber || '',
        contactPerson: project.contactPerson || '',
        customerName: project.customerName || '',
        customerAddress: project.customerAddress || '',
        email: project.email || '',
        invoicePurpose: project.invoicePurpose || '',
        agreementRef: project.agreementRef || '',
        agreementType: project.agreementType || 'SOW',
        currency: project.currency || 'USD',
        status: project.status || 'draft',
        invoiceDate: getInitialInvoiceDate(),
        paymentDueDate: project.paymentDueDate 
          ? convertDateForInput(project.paymentDueDate)
          : getPaymentDueDate(getInitialInvoiceDate(), project.paymentDueDays),
        // Initialize dynamic fields from localStorage or defaults
        ...(() => {
          const storedDynamicFields = loadDynamicFieldsFromStorage(project.id);
          if (storedDynamicFields) return storedDynamicFields;
          const derivedWorkPeriod = project.workPeriod || getMonthYearFromYMD(toYMD(project.lastImportedInvoiceDate || '') || getInitialInvoiceDate());
          const baseYmdFromWP = workPeriodToYMD(derivedWorkPeriod) || getInitialInvoiceDate();
          return {
            invoiceNumber: generateInvoiceNumber(project.uniqueProjectIdentifier, project.name, baseYmdFromWP),
            workPeriod: derivedWorkPeriod,
            totalAmount: calculateTotalAmount()
          };
        })()
      };
      setEditData(defaultProject);
    }
  }, [project, isEditing]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !project)) {
    return (
      <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 mt-2">
          <div className="flex justify-between items-center mb-6">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Link>
          </div>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error ? `Error loading project: ${error.message}` : `The project with ID "${id}" could not be found.`}
            </p>
            <Link to="/">
              <Button>Back to Projects</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getCurrentMonthYear = (): string => {
    const now = new Date();
    const month = now.toLocaleDateString("en-US", { month: "long" });
    const year = now.getFullYear();
    return `${month} ${year}`;
  };

  const getMonthYearFromYMD = (ymd: string): string => {
    const d = new Date(ymd);
    if (isNaN(d.getTime())) return getCurrentMonthYear();
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

  const generateInvoiceNumber = (uniqueProjectIdentifier?: string, projectName?: string, baseDateYMD?: string): string => {
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
  };

  const calculateTotalAmount = (): number => {
    if (project?.employees && project.employees.length > 0) {
      return project.employees.reduce((sum, emp) => sum + emp.total, 0);
    }

    const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isGenericTotalMetaRow = (row: unknown[]) => {
      const first = String(row?.[0] ?? '').trim();
      if (first === '__META_TOTAL__') return true;
      return normalizeHeader(first) === 'total';
    };
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

    const uploads = Array.isArray(project?.genericExcelUploads)
      ? (project?.genericExcelUploads as unknown[])
      : [];
    if (uploads.length === 0) return 0;

    return uploads.reduce<number>((sumSheets, up) => {
      const upload = up as { headers?: unknown; rows?: unknown };
      const headersRaw = Array.isArray(upload?.headers) ? (upload?.headers as unknown[]) : null;
      const rowsRaw = Array.isArray(upload?.rows) ? (upload?.rows as unknown[]) : null;
      if (!headersRaw || !rowsRaw) return sumSheets;

       const metaRow = (rowsRaw as unknown[]).find((r) => {
        const row = Array.isArray(r) ? (r as unknown[]) : [];
        return isGenericTotalMetaRow(row);
      });
      if (metaRow) {
        const row = Array.isArray(metaRow) ? (metaRow as unknown[]) : [];
        const n = parseNumericCell(row?.[1]);
        if (Number.isFinite(n)) return sumSheets + n;
      }

      const headers = headersRaw.map((h) => String(h ?? '').trim());
      const normalizedHeaders = headers.map((h) => normalizeHeader(h));
      const rateIdx = normalizedHeaders.findIndex((h) => h === 'rateperhour' || h === 'ratehour' || h === 'rateperhr');
      const hoursIdx = normalizedHeaders.findIndex((h) => h === 'hours' || h === 'hour');
      if (rateIdx === -1 || hoursIdx === -1) return sumSheets;

      const sheetSum = (rowsRaw as unknown[])
        .filter((r) => !isGenericTotalMetaRow(Array.isArray(r) ? (r as unknown[]) : []))
        .reduce<number>((sum, r) => {
        const row = Array.isArray(r) ? (r as unknown[]) : [];
        const rate = parseNumericCell(row[rateIdx]);
        const hours = parseNumericCell(row[hoursIdx]);
        return sum + rate * hours;
      }, 0);

      return sumSheets + sheetSum;
    }, 0);
  };

  const handleEdit = () => {
    setIsEditing(true);
    const defaultProject: ProjectWithTemplateFields = {
      ...project,
      phoneNumber: project.phoneNumber || '',
      contactPerson: project.contactPerson || '',
      customerName: project.customerName || '',
      customerAddress: project.customerAddress || '',
      email: project.email || '',
      invoicePurpose: project.invoicePurpose || '',
      agreementRef: project.agreementRef || '',
      agreementType: project.agreementType || 'SOW',
      currency: project.currency || 'USD',
      status: project.status || 'draft',
      invoiceDate: getInitialInvoiceDate(),
      paymentDueDate: project.paymentDueDate 
        ? convertDateForInput(project.paymentDueDate)
        : getPaymentDueDate(getInitialInvoiceDate(), project.paymentDueDays),
      // Initialize dynamic fields from localStorage or defaults
      ...(() => {
        const storedDynamicFields = loadDynamicFieldsFromStorage(project.id);
        if (storedDynamicFields) return storedDynamicFields;
        const derivedWorkPeriod = project.workPeriod || getMonthYearFromYMD(toYMD(project.lastImportedInvoiceDate || '') || getInitialInvoiceDate());
        const baseYmdFromWP = workPeriodToYMD(derivedWorkPeriod) || getInitialInvoiceDate();
        return {
          invoiceNumber: generateInvoiceNumber(project.uniqueProjectIdentifier, project.name, baseYmdFromWP),
          workPeriod: derivedWorkPeriod,
          totalAmount: calculateTotalAmount()
        };
      })()
    };
    setEditData(defaultProject);
  };


  const saveDynamicFieldsToStorage = (projectId: string, dynamicFields: {
    invoiceNumber?: string;
    invoiceDate?: string;
    paymentDueDate?: string;
    workPeriod?: string;
    totalAmount?: number;
  }) => {
    const key = `dynamicFields_${projectId}`;
    localStorage.setItem(key, JSON.stringify(dynamicFields));
  };

  const loadDynamicFieldsFromStorage = (projectId: string) => {
    const key = `dynamicFields_${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  };

  const validateDynamicFields = (data: ProjectWithTemplateFields): string[] => {
    const errors: string[] = [];
    
    // Validate invoice number
    if (!data.invoiceNumber?.trim()) {
      errors.push("Invoice number is required");
    } else if (data.invoiceNumber.trim().length < 3) {
      errors.push("Invoice number must be at least 3 characters");
    }
    
    // Validate work period
    if (!data.workPeriod?.trim()) {
      errors.push("Work period is required");
    } else if (data.workPeriod.trim().length < 3) {
      errors.push("Work period must be at least 3 characters");
    }
    
    return errors;
  };

  const handleSave = async () => {
    // Check if form is valid before saving
    if (!isFormValid) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before saving.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate dynamic fields
    if (editData) {
      const dynamicFieldErrors = validateDynamicFields(editData);
      if (dynamicFieldErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: dynamicFieldErrors.join(", "),
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      // Save dynamic fields to localStorage before saving to database
      const dynamicFields = {
        invoiceNumber: editData.invoiceNumber,
        invoiceDate: editData.invoiceDate,
        paymentDueDate: editData.paymentDueDate,
        workPeriod: editData.workPeriod,
        totalAmount: editData.totalAmount
      };
      saveDynamicFieldsToStorage(project.id, dynamicFields);

      // Save column widths to localStorage
      if (columnWidthActions) {
        columnWidthActions.save();
      }

      // Exclude dynamic calculated fields from being saved to database
      // Keep invoiceDate in payload so server can map it to lastImportedInvoiceDate
      const updatedProject = { ...editData };
      delete updatedProject.paymentDueDate;
      delete updatedProject.invoiceNumber;
      delete updatedProject.totalAmount;

      await updateProjectMutation.mutateAsync({ id: project.id, data: updatedProject });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "project details & invoice updated successfully",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update project',
        variant: "destructive"
      })
    }
  };

  const handleCancel = () => {
    const defaultProject: ProjectWithTemplateFields = {
      ...project,
      phoneNumber: project.phoneNumber || '',
      contactPerson: project.contactPerson || '',
      customerName: project.customerName || '',
      customerAddress: project.customerAddress || '',
      email: project.email || '',
      invoicePurpose: project.invoicePurpose || '',
      agreementRef: project.agreementRef || '',
      agreementType: project.agreementType || 'SOW',
      currency: project.currency || 'USD',
      status: project.status || 'draft',
      invoiceDate: getInitialInvoiceDate(),
      paymentDueDate: project.paymentDueDate 
        ? convertDateForInput(project.paymentDueDate)
        : getPaymentDueDate(getInitialInvoiceDate(), project.paymentDueDays),
      // Reset dynamic fields to original calculated values
      invoiceNumber: generateInvoiceNumber(project.uniqueProjectIdentifier, project.name, getInitialInvoiceDate()),
      workPeriod: getMonthYearFromYMD(getInitialInvoiceDate()),
      totalAmount: calculateTotalAmount()
    };
    setEditData(defaultProject);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => {
      if (!prev) return prev;
      
      // Convert numeric fields to proper types
      let processedValue: string | number = value;
      if (field === 'vatPercentage') {
        processedValue = value ? parseFloat(value) : 0;
      } else if (field === 'paymentDueDays') {
        processedValue = value ? parseInt(value, 10) : 30;
      } else if (field === 'taxNumber') {
        // Ensure taxNumber is always a string
        processedValue = value || '';
      } else if (field === 'totalAmount') {
        // Handle totalAmount as number
        processedValue = value ? parseFloat(value) : 0;
      }

      // Base next state
      let next: ProjectWithTemplateFields = {
        ...prev,
        [field]: processedValue as unknown
      } as ProjectWithTemplateFields;

      // Keep paymentDueDate dependent on invoiceDate and paymentDueDays
      if (field === 'invoiceDate') {
        const newInvoiceDate = processedValue as string;
        next = {
          ...next,
          paymentDueDate: getPaymentDueDate(newInvoiceDate, (prev.paymentDueDays ?? project?.paymentDueDays))
        };
      } else if (field === 'paymentDueDays') {
        const newPaymentDueDays = processedValue as number;
        const baseInvoiceDate = (prev.invoiceDate || getInitialInvoiceDate());
        next = {
          ...next,
          paymentDueDate: getPaymentDueDate(baseInvoiceDate, newPaymentDueDays)
        };
      } else if (field === 'paymentDueDate') {
        // If user changes payment due date manually, back-calculate invoiceDate using paymentDueDays
        const newPaymentDueDateStr = processedValue as string;
        const paymentDays = (prev.paymentDueDays ?? project?.paymentDueDays ?? 15);
        const due = new Date(newPaymentDueDateStr);
        if (!isNaN(due.getTime())) {
          const inv = new Date(due);
          inv.setDate(inv.getDate() - paymentDays);
          const y = inv.getFullYear();
          const m = String(inv.getMonth() + 1).padStart(2, '0');
          const d = String(inv.getDate()).padStart(2, '0');
          next = {
            ...next,
            invoiceDate: `${y}-${m}-${d}`
          };
        }
      } else if (field === 'workPeriod') {
        const newWP = processedValue as string;
        const baseYmdFromWP = workPeriodToYMD(newWP) || getInitialInvoiceDate();
        next = {
          ...next,
          invoiceNumber: generateInvoiceNumber(project?.uniqueProjectIdentifier, project?.name, baseYmdFromWP)
        } as ProjectWithTemplateFields;
      }

      return next;
    });
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const exportWithSignatureToggle = async (withSignature: boolean) => {
    // Set loading state for the specific button
    const buttonType = withSignature ? 'signed' : 'regular';
    setIsExporting(prev => ({ ...prev, [buttonType]: true }));
    
    const prev = includeSignature;
    try {
      setIncludeSignature(withSignature);
      // Allow DOM to update before snapshot
      await new Promise((res) => setTimeout(res, 150));
      await exportInvoiceToPDF(project.id, project.invoiceNumber);
      toast({
        title: "PDF Export Successful",
        description: withSignature ? "Invoice downloaded with signature & stamp." : "Invoice downloaded without signature & stamp.",
        variant: "success",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "PDF Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIncludeSignature(prev);
      setIsExporting(prev => ({ ...prev, [buttonType]: false }));
    }
  };

  return (
    <>
    {/* Header */}

    <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
      <div className="sticky z-50 bg-gray-50 py-3 px-8 shadow-sm" style={{top: '52px'}}>
            <div className="flex justify-between items-center">
              <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-primary hover:bg-orange-500">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => exportWithSignatureToggle(false)}
                      className="btn-outline border border-primary text-primary"
                      disabled={isExporting.regular || isExporting.signed}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting.regular ? 'Downloading...' : 'Download PDF'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportWithSignatureToggle(true)}
                      className="btn-outline border border-green-600 text-green-700 hover:bg-green-50"
                      disabled={isExporting.regular || isExporting.signed}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting.signed ? 'Downloading...' : 'Download Signed PDF'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleEdit}
                      className="btn-outline border border-gray-800 text-gray-800 hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Document
                    </Button>
                  </>
                )}

              </div>
            </div>
            
            {/* Dynamic Fields Information Note - Only show when editing */}
            {/* {isEditing && (
              <div className="px-3 pt-3">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <p className="text-green-800 text-sm font-medium">
                    Fields with a green border are dynamic inputs. Data entered here will not be saved permanently.
                  </p>
                </div>
              </div>
            )} */}
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Template Renderer */}
        <div id='invoice-container'>
          <SimpleTemplateRenderer
            project={project}
            template={selectedTemplate}
            isEditing={isEditing}
            editData={editData}
            onInputChange={handleInputChange}
            onValidationChange={handleValidationChange}
            includeSignature={includeSignature}
            registerColumnWidthActions={setColumnWidthActions}
          />
        </div>
      </div>
    </div>
    </>
  );
}
