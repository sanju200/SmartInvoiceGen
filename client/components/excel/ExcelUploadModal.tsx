import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Users,
  Building,
  Calendar as CalendarIcon
} from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { useProjects, useCreateProject } from '../../hooks/useProjects';
import { useImportSnapshot } from '../../hooks/useEmployees';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface ExcelUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportResult?: (result: { importedProjectIds: string[]; tabByProjectId: Record<string, string> }) => void;
}

interface ParsedEmployeeData {
  projectName: string;
  employeeName: string;
  rate: number;
  hours: number;
  amount: number;
}

interface ProjectMatch {
  projectName: string;
  employees: ParsedEmployeeData[];
  matchedProjectId?: string;
  matchedProjectName?: string;
}

export default function ExcelUploadModal({ open, onOpenChange, onImportResult }: ExcelUploadModalProps) {
  const { data: projects = [] } = useProjects();
  const importSnapshot = useImportSnapshot();
  const createProject = useCreateProject();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ProjectMatch[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [excelTabs, setExcelTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [invoiceDateOpen, setInvoiceDateOpen] = useState(false);

  const [uploadMode, setUploadMode] = useState<'template' | 'generic'>('template');

  const [genericIsDragOver, setGenericIsDragOver] = useState(false);
  const [genericIsUploading, setGenericIsUploading] = useState(false);
  const [genericUploadStatus, setGenericUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [genericErrorMessage, setGenericErrorMessage] = useState('');
  const [genericWorkbook, setGenericWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [genericExcelTabs, setGenericExcelTabs] = useState<string[]>([]);
  const [genericSelectedTab, setGenericSelectedTab] = useState<string>('');
  const [genericHeaders, setGenericHeaders] = useState<string[]>([]);
  const [genericRows, setGenericRows] = useState<string[][]>([]);
  const [genericSheetsByName, setGenericSheetsByName] = useState<Record<string, { headers: string[]; rows: string[][] }>>({});
  const [genericFileName, setGenericFileName] = useState<string>('');
  const [genericBaseProjectId, setGenericBaseProjectId] = useState<string>('');
  const [genericBaseProjectTouched, setGenericBaseProjectTouched] = useState(false);
  const [genericIsCreatingCopy, setGenericIsCreatingCopy] = useState(false);
  const [genericInvoiceDate, setGenericInvoiceDate] = useState<Date>(new Date());
  const [genericInvoiceDateOpen, setGenericInvoiceDateOpen] = useState(false);

  const isLegacyCopyProjectName = (name: string) => name.includes(' - Copy ');
  const isCopyProject = (p: (typeof projects)[number]) => (p.isCopy ?? false) || isLegacyCopyProjectName(p.name);
  const templateUploadProjects = projects.filter((p) => !isCopyProject(p));

  const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizeProjectName = (s: string) =>
    (s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ');

  const isGenericTotalMetaRow = (row: string[]) =>
    (String(row?.[0] ?? '').trim() === '__META_TOTAL__') || normalizeHeader(String(row?.[0] ?? '')) === 'total';



  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleGenericDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setGenericIsDragOver(true);
  };

  const handleGenericDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setGenericIsDragOver(false);
  };

  const handleGenericDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGenericIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleGenericFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleGenericFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleGenericFileUpload(files[0]);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setInvoiceDate(date);
      setInvoiceDateOpen(false);
      console.log('Invoice date is ', date);
    }
  }

  const parseExcelData = (data: unknown[]): ParsedEmployeeData[] => {
    const employeeData: ParsedEmployeeData[] = [];

    // Skip header row and process data
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length < 4) continue;

      // Safely access and convert row data
      const getCellValue = (index: number): string => {
        const value = row[index];
        return value !== null && value !== undefined ? String(value) : '';
      };

      const employeeName = getCellValue(0).trim();
      const projectName = getCellValue(1).trim();
      const rate = parseFloat(getCellValue(2)) || 0;
      const hours = parseFloat(getCellValue(3)) || 0;
      // Ignore any value provided in Total column; calculate at runtime
      const amount = rate * hours;

      // console.log(`🔍 Parsed Row ${i}:`, {
      //   projectName,
      //   employeeName,
      //   rate,
      //   hours,
      //   amount
      // });

      if (projectName && employeeName && (rate > 0 || hours > 0)) {
        employeeData.push({
          projectName,
          employeeName,
          rate,
          hours,
          amount
        });
      } 
    }

    return employeeData;
  };

  const groupByProject = (employees: ParsedEmployeeData[]): ProjectMatch[] => {
    const grouped = employees.reduce((acc, employee) => {
      const projectName = employee.projectName;
      if (!acc[projectName]) {
        acc[projectName] = [];
      }
      acc[projectName].push(employee);
      return acc;
    }, {} as Record<string, ParsedEmployeeData[]>);

    return Object.entries(grouped).map(([projectName, employees]) => {
      // Strict match against existing projects.
      // Partial matching can incorrectly match "copy" projects whose names contain the original name.
      const excelKey = normalizeProjectName(projectName);
      const matchedProject = templateUploadProjects.find((p) => normalizeProjectName(p.name) === excelKey);

      // if (!matchedProject) {
      //   console.log('❌ No match found for:', projectName);
      // }

      return {
        projectName,
        employees,
        matchedProjectId: matchedProject?.id,
        matchedProjectName: matchedProject?.name
      };
    });
  };

  useEffect(() => {
    if (selectedProjectId === 'all') return;
    const isTemplateCopySelected = projects.some((p) => p.id === selectedProjectId && isCopyProject(p));
    if (isTemplateCopySelected) {
      setSelectedProjectId('all');
    }
  }, [projects, selectedProjectId]);

  const handleFileUpload = async (file: File) => {
    // Reset invoice date to today for each new upload
    setInvoiceDate(new Date());
    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      // Validate file type
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('Please upload a valid Excel file (.xlsx or .xls)');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Store workbook and available tabs
          setWorkbook(workbook);
          setExcelTabs(workbook.SheetNames);

          // Prefer 'Employee Data'; otherwise, use the first sheet
          const defaultTab = workbook.SheetNames.includes('Employee Data')
            ? 'Employee Data'
            : workbook.SheetNames[0];
          setSelectedTab(defaultTab);

          // Track selection for UI
          setSelectedMonth(defaultTab);

          // Process the chosen tab
          processSelectedTab(workbook, defaultTab);
          
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Failed to parse Excel file');
          setUploadStatus('error');
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload file');
      setUploadStatus('error');
      setIsUploading(false);
    }
  };

  const processSelectedTab = (workbook: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }

      // Validate header format strictly against the template
      const headers = ((jsonData[0] as unknown[]) ?? []).map(h => String(h ?? '').trim());

      const expectedHeaders = [
        'Employee Name',
        'Project Name',
        'Rate Per Hour',
        'Hours',
        'Total Amount'
      ] as const;

      const headerMismatch = expectedHeaders.some((h, i) => (headers[i] || '').toLowerCase() !== h.toLowerCase());
      if (headerMismatch || headers.length < expectedHeaders.length) {
        throw new Error(
          `Invalid Excel header. Expected columns: "${expectedHeaders.join(' | ')}" in this exact order. ` +
          `Found: "${headers.join(' | ')}". Please use the Download Template.`
        );
      }

      // Parse employee data
      const parsedEmployees = parseExcelData(jsonData);

      if (parsedEmployees.length === 0) {
        throw new Error(`No valid employee data found in Excel file.

      Expected format:
      Column A: Employee Name (e.g., "John Doe")
      Column B: Project Name (e.g., "West Hormonics")
      Column C: Rate Per Hour (e.g., 15.25)
      Column D: Hours (e.g., 160)
      Column E: Total Amount (optional)`);
      }

      // Group by project
      const projectMatches = groupByProject(parsedEmployees);
      setParsedData(projectMatches);
      setUploadStatus('success');
    } catch (error) {
      console.error('Error processing tab:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process selected tab');
      setUploadStatus('error');
    }
  };

  const handleTabChange = (tabName: string) => {
    setSelectedTab(tabName);
    setSelectedMonth(tabName);
    if (workbook) {
      processSelectedTab(workbook, tabName);
    }
  };

  const getEffectiveGenericColCount = (sheetRows: unknown[], maxCols: number) => {
    let max = 0;
    for (let r = 0; r < sheetRows.length; r++) {
      const row = sheetRows[r];
      if (!Array.isArray(row)) continue;
      const rowArr = row as unknown[];
      const limit = Math.min(rowArr.length, maxCols);
      for (let c = limit - 1; c >= 0; c--) {
        if (String(rowArr[c] ?? '').trim() !== '') {
          max = Math.max(max, c + 1);
          break;
        }
      }
    }
    return Math.max(0, Math.min(max, maxCols));
  };

  const parseGenericSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) as unknown[];
    const rows = (Array.isArray(jsonData) ? jsonData : []) as unknown[];
    if (rows.length === 0) {
      throw new Error('Excel sheet is empty');
    }

    const firstRowRaw = (rows[0] as unknown[]) ?? [];
    const firstRow = Array.isArray(firstRowRaw) ? firstRowRaw : [];

    const hasTotalMetaRow =
      normalizeHeader(String(firstRow[0] ?? '')) === 'total' && String(firstRow[1] ?? '').trim() !== '';

    const maxCols = 200;
    const rowsForColCount = hasTotalMetaRow ? rows.slice(1) : rows;
    const colCount = getEffectiveGenericColCount(rowsForColCount, maxCols);
    if (colCount === 0) {
      throw new Error('Excel sheet is empty');
    }

    const headerRowIndex = hasTotalMetaRow ? 1 : 0;
    if (rows.length <= headerRowIndex) {
      throw new Error('Excel sheet must include a header row');
    }

    const headerRowRaw = (rows[headerRowIndex] as unknown[]) ?? [];
    const headerRow = Array.isArray(headerRowRaw) ? headerRowRaw : [];
    const headers: string[] = [];
    for (let i = 0; i < colCount; i++) {
      const v = String(headerRow[i] ?? '').trim();
      headers.push(v || `Column ${i + 1}`);
    }

    const dataRows = rows
      .slice(headerRowIndex + 1)
      .filter((r) => Array.isArray(r) && (r as unknown[]).some((c) => String(c ?? '').trim() !== ''))
      .map((r) => {
        const rowArr = (Array.isArray(r) ? r : []) as unknown[];
        const baseOut: string[] = [];
        for (let i = 0; i < headers.length; i++) {
          baseOut.push(String(rowArr[i] ?? '').trim());
        }
        return baseOut;
      })
      .slice(0, 5000);

    const metaRows: string[][] = [];
    if (hasTotalMetaRow) {
      const totalVal = String(firstRow[1] ?? '').trim();
      const meta: string[] = Array.from({ length: headers.length }, () => '');
      meta[0] = '__META_TOTAL__';
      meta[1] = totalVal;
      metaRows.push(meta);
    }

    return { headers, rows: [...metaRows, ...dataRows] };
  };

  const processGenericSelectedTab = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const parsed = parseGenericSheet(wb, sheetName);
      setGenericSheetsByName((prev) => ({
        ...prev,
        [sheetName]: parsed,
      }));

      if (sheetName === genericSelectedTab) {
        setGenericUploadStatus('success');
      }

      return parsed;
    } catch (error) {
      console.error('Error processing generic tab:', error);
      if (sheetName === genericSelectedTab) {
        setGenericErrorMessage(error instanceof Error ? error.message : 'Failed to process selected tab');
        setGenericUploadStatus('error');
      }
      return null;
    }
  };

  const handleGenericTabChange = (tabName: string) => {
    setGenericSelectedTab(tabName);
    const cached = genericSheetsByName[tabName];
    if (cached) {
      setGenericHeaders(cached.headers);
      setGenericRows(cached.rows);
      return;
    }
    if (genericWorkbook) {
      const parsed = processGenericSelectedTab(genericWorkbook, tabName);
      if (parsed) {
        setGenericHeaders(parsed.headers);
        setGenericRows(parsed.rows);
        setGenericUploadStatus('success');
        setGenericErrorMessage('');
      }
    }
  };

  const handleGenericFileUpload = async (file: File) => {
    setGenericIsUploading(true);
    setGenericUploadStatus('idle');
    setGenericErrorMessage('');
    setGenericHeaders([]);
    setGenericRows([]);
    setGenericSheetsByName({});
    setGenericFileName(file.name);
    setGenericInvoiceDate(new Date());
    if (!genericBaseProjectTouched) {
      setGenericBaseProjectId(templateUploadProjects[0]?.id || '');
    }

    try {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('Please upload a valid Excel file (.xlsx or .xls)');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });

          setGenericWorkbook(wb);
          setGenericExcelTabs(wb.SheetNames);

          const defaultTab = wb.SheetNames[0] || '';
          setGenericSelectedTab(defaultTab);

          if (!defaultTab) {
            throw new Error('No sheets found in workbook');
          }

          const sheetsByName: Record<string, { headers: string[]; rows: string[][] }> = {};
          for (const name of wb.SheetNames) {
            try {
              sheetsByName[name] = parseGenericSheet(wb, name);
            } catch {
              // ignore per-sheet errors; the selected sheet will still show its own error
            }
          }

          setGenericSheetsByName(sheetsByName);

          const selected = sheetsByName[defaultTab];
          if (!selected) {
            throw new Error('Failed to parse selected sheet');
          }

          setGenericHeaders(selected.headers);
          setGenericRows(selected.rows);
          setGenericUploadStatus('success');
        } catch (error) {
          console.error('Error parsing generic Excel file:', error);
          setGenericErrorMessage(error instanceof Error ? error.message : 'Failed to parse Excel file');
          setGenericUploadStatus('error');
        } finally {
          setGenericIsUploading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      setGenericErrorMessage(error instanceof Error ? error.message : 'Failed to upload file');
      setGenericUploadStatus('error');
      setGenericIsUploading(false);
    }
  };

  const handleImportData = async () => {
    try {
      // Build atomic snapshot payload
      const items = parsedData
        .filter(p => p.matchedProjectId && (selectedProjectId === 'all' || p.matchedProjectId === selectedProjectId))
        .map(p => ({
          projectId: p.matchedProjectId!,
          tabName: selectedTab,
          invoiceDate: format(invoiceDate, 'yyyy-MM-dd'),
          employees: p.employees.map(emp => ({
            name: emp.employeeName,
            ratePerHour: emp.rate,
            hours: emp.hours,
            total: emp.amount,
          })),
        }));

      // When importing for a single project, do NOT clear others
      const response = await importSnapshot.mutateAsync({ clearOthers: selectedProjectId === 'all', items });

      // Prepare result info for parent (tab mapping from current tab selection)
      const importedIds = response.perProject.map(r => r.projectId);
      const tabByProjectId = Object.fromEntries(importedIds.map(id => [id, selectedTab] as const));

      // Persist the selected invoice date to BACKEND for each imported project.
      // If any update fails (e.g., pending migration), fall back to localStorage so Preview still shows it.
      if (invoiceDate && importedIds.length > 0) {
        const formatted = format(invoiceDate, 'yyyy-MM-dd');
       console.log(formatted);
      }

      onImportResult?.({ importedProjectIds: importedIds, tabByProjectId });

      // Close modal and reset state
      resetUpload();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing data:', error);
      setErrorMessage('Failed to import employee data. Please try again.');
      setUploadStatus('error');
    }
  };

  const downloadSampleTemplate = () => {
    // Only header row as requested — no sample data
    const sampleData = [
      ['Employee Name', 'Project Name', 'Rate Per Hour', 'Hours', 'Total Amount']
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Data');
    XLSX.writeFile(wb, 'employee_data_template.xlsx');

  };

  const downloadGenericTemplate = () => {
    // Template with Total row pattern and flexible columns
    const templateData = [
      ['Total', '0', '', 'Note: Total in custom invoice will be displayed from cell B1'],
      ['Col1', 'Col2', 'Col3', 'Col4', 'Col5', 'Col6'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Merge D1:L1 (Row 0, Col 3 to Row 0, Col 11)
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 3 }, e: { r: 0, c: 11 } });

    // Apply Style to D1 (which covers the merged area)
    const noteCell = ws[XLSX.utils.encode_cell({ r: 0, c: 3 })];
    if (noteCell) {
      noteCell.s = {
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'FCE4D6' } }, // Orange accent 6, lighter 60%
        font: { name: 'Calibri', sz: 11, color: { rgb: '000000' } },
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Generic Data');
    XLSX.writeFile(wb, 'generic_excel_template.xlsx');
  };

  const resetUpload = useCallback(() => {
    setParsedData([]);
    setUploadStatus('idle');
    setErrorMessage('');
    setExcelTabs([]);
    setSelectedTab('');
    setWorkbook(null);
    setSelectedMonth('');
    setSelectedProjectId('all');
    setInvoiceDate(new Date());
    // Clear hidden file input so selecting the same file triggers onChange
    setTimeout(() => {
      const input = document.getElementById('excel-upload') as HTMLInputElement | null;
      if (input) input.value = '';
    }, 100);
  }, []);

  const resetGenericUpload = useCallback(() => {
    setGenericIsDragOver(false);
    setGenericIsUploading(false);
    setGenericUploadStatus('idle');
    setGenericErrorMessage('');
    setGenericWorkbook(null);
    setGenericExcelTabs([]);
    setGenericSelectedTab('');
    setGenericHeaders([]);
    setGenericRows([]);
    setGenericSheetsByName({});
    setGenericFileName('');
    setGenericIsCreatingCopy(false);
    setGenericInvoiceDate(new Date());
    setGenericInvoiceDateOpen(false);
    setGenericBaseProjectId('');
    setGenericBaseProjectTouched(false);
    setTimeout(() => {
      const input = document.getElementById('excel-upload-generic') as HTMLInputElement | null;
      if (input) input.value = '';
    }, 100);
  }, []);

  const handleModeChange = (mode: string) => {
    const next = mode === 'generic' ? 'generic' : 'template';
    setUploadMode(next);
    if (next === 'template') {
      resetGenericUpload();
    } else {
      resetUpload();
    }
  };

  const handleCreateProjectCopy = async () => {
    if (!genericSelectedTab || genericHeaders.length === 0) {
      setGenericErrorMessage('Please upload a valid Excel file first');
      setGenericUploadStatus('error');
      return;
    }

    const base = templateUploadProjects.find((p) => p.id === genericBaseProjectId);
    if (!base) {
      setGenericErrorMessage('Please select a project to copy');
      setGenericUploadStatus('error');
      return;
    }

    try {
      setGenericIsCreatingCopy(true);
      setGenericErrorMessage('');

      const createCopyForBase = async (proj: (typeof projects)[number]) => {
        const upiBase = (proj.uniqueProjectIdentifier || proj.name || 'PROJECT').replace(/\s+/g, '-').toUpperCase();
        const upiSuffix = Date.now().toString(36).toUpperCase().slice(-6);

        const payload = {
          name: proj.name,
          isCopy: true,
          originalProjectId: proj.id,
          description: proj.description || '',
          uniqueProjectIdentifier: `${upiBase}-${upiSuffix}`,
          customerName: proj.customerName,
          customerAddress: proj.customerAddress,
          contactPerson: proj.contactPerson,
          email: proj.email,
          phoneNumber: proj.phoneNumber || '',
          agreementType: proj.agreementType,
          agreementRef: proj.agreementRef || '',
          poNumber: proj.poNumber || '',
          vatPercentage: proj.vatPercentage ?? undefined,
          taxIdentificationType: proj.taxIdentificationType ?? undefined,
          taxNumber: proj.taxNumber ?? undefined,
          invoicePurpose: proj.invoicePurpose,
          currency: proj.currency,
          status: proj.status,
          paymentDueDays: proj.paymentDueDays ?? undefined,
          workPeriod: proj.workPeriod ?? undefined,
          genericExcelUploads: Object.entries(genericSheetsByName).map(([sheetName, sheet]) => {
            return {
              fileName: genericFileName || undefined,
              sheetName,
              invoiceDate: format(genericInvoiceDate, 'yyyy-MM-dd'),
              headers: sheet.headers,
              rows: sheet.rows,
            };
          }),
          genericExcelUpload: {
            fileName: genericFileName || undefined,
            sheetName: genericSelectedTab,
            invoiceDate: format(genericInvoiceDate, 'yyyy-MM-dd'),
            headers: genericHeaders,
            rows: genericRows,
          },
        };

        await createProject.mutateAsync(payload);
        return true;
      };

      const created = await createCopyForBase(base);
      if (!created) {
        setGenericErrorMessage('Failed to create project copy.');
        setGenericUploadStatus('error');
        return;
      }

      resetGenericUpload();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project copy:', error);
      const msg = error instanceof Error ? error.message : 'Failed to create project copy';
      setGenericErrorMessage(msg);
      setGenericUploadStatus('error');
    } finally {
      setGenericIsCreatingCopy(false);
    }
  };

  useEffect(() => {
    if (open) {
      resetUpload();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setUploadMode('template');
      resetGenericUpload();
    }
  }, [open, resetGenericUpload]);

  useEffect(() => {
    if (!open) return;
    if (!genericBaseProjectId && projects.length > 0) {
      setGenericBaseProjectId(templateUploadProjects[0]?.id || '');
    }
  }, [open, projects, genericBaseProjectId, templateUploadProjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-white p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-600" />
            Upload Excel Sheet
          </DialogTitle>
          <DialogDescription>
            <div className='grid gap-0' style={{gridTemplateColumns: 'auto 180px'}}>
              <div>
                <p>Upload an Excel file containing employee data with project assignments. The system will automatically match employees to existing projects.</p>
              </div>
              <div className='flex items-center justify-end'>
                <Tabs value={uploadMode} onValueChange={handleModeChange} className='w-full'>
                  <TabsList className="relative flex w-full bg-gray-100 border border-gray-300 p-0.5 ">
                    <TabsTrigger 
                      value="template" 
                      className="flex-grow justify-center data-[state=active]:bg-[#0d6efd] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 font-medium text-xs h-9 px-3  data-[state=active]:z-10"
                    >
                      Default
                    </TabsTrigger>
                    <TabsTrigger 
                      value="generic" 
                      className="flex-grow justify-center data-[state=active]:bg-[#0d6efd] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 font-medium text-xs h-9 px-3"
                    >
                      Generic
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </DialogDescription>
          
          <DialogClose className="absolute right-2 top-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm">
            <X className="h-4 w-4 text-gray-500 hover:text-gray-800" onClick={() => onOpenChange(false)} />
          </DialogClose>
        </DialogHeader>

        {uploadMode === 'template' ? (
        <div className="space-y-6 px-6 pb-6">
          {/* Sample Template Download */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Need a template?</p>
                <p className="text-sm text-blue-700">Download our sample Excel template to see the expected format</p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadSampleTemplate} className="text-blue-700 border-blue-300">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Upload Area */}
          {uploadStatus === 'idle' && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragOver ? 'Drop Excel file here' : 'Upload Excel File'}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop your Excel file here, or click to browse
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload">
                <Button className="bg-green-600 hover:bg-green-700" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Browse Files
                  </span>
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-2">Supports .xlsx and .xls files</p>
            </div>
          )}

          {/* Loading State */}
          {isUploading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Processing Excel file...</p>
            </div>
          )}

          {/* Error State */}
          {uploadStatus === 'error' && (
            <div className="space-y-3">
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetUpload();
                  }}
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    resetUpload();
                    setTimeout(() => {
                      const input = document.getElementById('excel-upload') as HTMLInputElement | null;
                      input?.click();
                    }, 0);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Browse Files
                </Button>
              </div>
            </div>
          )}

<div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold">Excel Data Parsed Successfully</h3>
                    {/* <p className="text-sm text-gray-600">
                      {parsedData.filter(p => p.matchedProjectId).length} existing projects will be updated
                      {parsedData.filter(p => !p.matchedProjectId).length > 0 && (
                        <span className="text-red-600">
                          , {parsedData.filter(p => !p.matchedProjectId).length} projects will be ignored
                        </span>
                      )}
                    </p> */}
                    <p className="text-xs text-gray-500 mt-1">
                      Importing will replace existing employees for matched projects.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={resetUpload} size="sm" disabled={uploadStatus !== 'success' || parsedData.length === 0}>
                  <X className="w-4 h-4 mr-2" />
                  Upload Different File
                </Button>
              </div>

          {/* Success State with Data Preview */
          // Compute visible data based on project filter
          }
          {uploadStatus === 'success' && parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                {/* <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-blue-600" />
                  <div> */}
                    {/* <p className="text-sm font-medium text-blue-900">Choose Import Target</p> */}
                    {/* <p className="text-xs text-blue-700">Choose a project to import for, or keep "All Projects" to import for every matched project{excelTabs.length > 1 ? '; also choose which Excel tab to import from' : ''}</p> */}
                  {/* </div>
                </div> */}
                <div className={`mt-3 grid gap-3 ${excelTabs.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  <div>
                  <p className="text-sm font-medium text-blue-900 mb-2">Select Project</p>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {templateUploadProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {excelTabs.length > 1 && (
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">Select Subsheet</p>
                      <Select value={selectedTab} onValueChange={handleTabChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {excelTabs.map((tabName) => (
                            <SelectItem key={tabName} value={tabName}>
                              {tabName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* <div className="mt-2 text-xs text-blue-600">
                        Available tabs: {excelTabs.join(', ')}
                      </div> */}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-2">Invoice Date</p>
                    <Popover open={invoiceDateOpen} onOpenChange={setInvoiceDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal text-sm"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(invoiceDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 z-[9999]" 
                        align="start"
                        side="bottom"
                        sideOffset={5}
                      >
                        <div
                          style={{ pointerEvents: 'auto' }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                        >
                          <Calendar
                            mode="single"
                            selected={invoiceDate}
                            onSelect={(date) => handleDateChange(date)}
                            initialFocus
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Selection validation messages */}
                <div className="mt-4 space-y-1">
                  {selectedProjectId !== 'all' && !parsedData.some(p => p.matchedProjectId === selectedProjectId) && (
                    <p className="text-sm text-red-600">No data in this file for the selected project. Choose All Projects or another project.</p>
                  )}
                  {selectedProjectId === 'all' && parsedData.every(p => !p.matchedProjectId) && (
                    <p className="text-sm text-red-600">No matching projects found in this file. Ensure Excel project names exactly match existing project names.</p>
                  )}
                  {excelTabs.length > 1 && !selectedTab && (
                    <p className="text-sm text-red-600">Please select an Excel tab to import from.</p>
                  )}
                </div>
              </div>

              {/* Excel Tab/Month Selection */}
              {/* unified project + tab container above replaces previous separate blocks */}

              {(() => {
                const visibleData = selectedProjectId === 'all'
                  ? parsedData
                  : parsedData.filter(p => p.matchedProjectId === selectedProjectId);
                return (
                  <div className="grid gap-4">
                {visibleData.map((projectMatch, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-orange-600" />
                          <h4 className="font-semibold text-gray-900">
                            Project: &quot;{projectMatch.projectName}&quot;
                          </h4>
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {projectMatch.employees.length} employees
                          </Badge>
                        </div>
                        {projectMatch.matchedProjectId ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Matched: {projectMatch.matchedProjectName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-700 border-red-400">
                            <X className="w-3 h-3 mr-1" />
                            Will be ignored (no matching project)
                          </Badge>
                        )}
                      </div>

                      {projectMatch.matchedProjectId ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium text-gray-700 mb-3">Employees to be added to existing project:</h5>
                          {(() => {
                            const proj = projects.find(p => p.id === projectMatch.matchedProjectId);
                            const cur = proj?.currency || '';
                            const symbolMap: Record<string, string> = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };
                            const symbol = symbolMap[cur as keyof typeof symbolMap] || '';
                            return (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                                  <thead>
                                    <tr className="bg-gray-100 text-gray-700">
                                      <th className="text-left px-3 py-2 border-b border-gray-200 font-medium uppercase text-xs">Name</th>
                                      <th className="text-right px-3 py-2 border-b border-gray-200 font-medium uppercase text-xs">Rate</th>
                                      <th className="text-right px-3 py-2 border-b border-gray-200 font-medium uppercase text-xs">Hours</th>
                                      <th className="text-right px-3 py-2 border-b border-gray-200 font-medium uppercase text-xs">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {projectMatch.employees.map((emp, empIndex) => (
                                      <tr key={empIndex} className={empIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-3 py-2 text-gray-900">
                                          <span className="font-medium">{emp.employeeName}</span>
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-700">
                                          {symbol}{emp.rate}/hr
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-700">
                                          {emp.hours + ' ' + 'h'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-900">
                                          {symbol + ' ' + emp.amount.toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-gray-100">
                                      <td colSpan={3} className="px-3 py-2 text-right font-medium text-gray-700 border-t border-gray-200">
                                        Total:
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-900 border-t border-gray-200">
                                        {symbol + ' ' + projectMatch.employees.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                          <h5 className="font-medium text-red-700 mb-2">Employees will NOT be imported:</h5>
                          <div className="space-y-1">
                            {projectMatch.employees.map((emp, empIndex) => (
                              <div key={empIndex} className="flex items-center justify-between text-sm text-red-600">
                                <span className="font-medium line-through">{emp.employeeName}</span>
                                <span className="line-through">
                                  {emp.rate}/hr × {emp.hours}h = {emp.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <p className="text-xs text-red-600">
                              ⚠️ No matching project found - these employees will be skipped
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
                );
              })()}

              {(() => {
                const hasImportable = parsedData.some(p => p.matchedProjectId && (selectedProjectId === 'all' || p.matchedProjectId === selectedProjectId));
                const tabError = excelTabs.length > 1 && !selectedTab;
                return hasImportable && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportData}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={importSnapshot.isPending || tabError}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {importSnapshot.isPending ? 'Importing...' : 'Import Employee Data'}
                  </Button>
                </div>
              );
              })()}
            </div>
          )}

          {/* Expected Format Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Expected Excel Format:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Column A:</strong> Employee Name</p>
              <p><strong>Column B:</strong> Project Name (must match existing project names)</p>
              <p><strong>Column C:</strong> Rate Per Hour</p>
              <p><strong>Column D:</strong> Hours</p>
              <p><strong>Column E:</strong> Total Amount (optional, will be calculated if not provided)</p>
            </div>

            {projects.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="font-medium text-gray-700 mb-2">Available Project Names:</h5>
                <div className="flex flex-wrap gap-1">
                  {projects.map(project => (
                    <span key={project.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      &quot;{project.name}&quot;
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Copy these exact names to your Excel files Project Name column
                </p>
              </div>
            )}
          </div>
        </div>
        ) : (
          <div className="space-y-6 px-6 pb-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Upload any Excel sheet</p>
                    <p className="text-sm text-blue-700">The custom invoice total will be displayed from cell <strong>B1</strong>.</p>
                     <p className="text-xs text-blue-700 mt-1"> <strong>Note: </strong> The <strong>Serial Number (S.No)</strong> column will be generated automatically and does not need to be included. </p>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadGenericTemplate} className="text-blue-700 border-blue-300 ml-4 shrink-0">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

            {genericUploadStatus === 'idle' && (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  genericIsDragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
                }`}
                onDragOver={handleGenericDragOver}
                onDragLeave={handleGenericDragLeave}
                onDrop={handleGenericDrop}
              >
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {genericIsDragOver ? 'Drop Excel file here' : 'Upload Excel File'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop your Excel file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleGenericFileSelect}
                  className="hidden"
                  id="excel-upload-generic"
                />
                <div className="flex flex-col items-center gap-3">
                  <label htmlFor="excel-upload-generic">
                    <Button className="bg-green-600 hover:bg-green-700" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Browse Files
                      </span>
                    </Button>
                  </label>
                  
                </div>
                <p className="text-xs text-gray-500 mt-4">Supports .xlsx and .xls files</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold">Excel Data Parsed Successfully</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {genericUploadStatus === 'success'
                      ? `Found ${genericRows.length} rows and ${genericHeaders.length} columns.`
                      : 'Upload an Excel file to see the preview.'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={resetGenericUpload} size="sm" disabled={genericUploadStatus !== 'success'}>
                <X className="w-4 h-4 mr-2" />
                Upload Different File
              </Button>
            </div>

            {genericIsUploading && (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Processing Excel file...</p>
              </div>
            )}

            {genericUploadStatus === 'error' && (
              <div className="space-y-3">
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {genericErrorMessage}
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetGenericUpload();
                    }}
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      resetGenericUpload();
                      setTimeout(() => {
                        const input = document.getElementById('excel-upload-generic') as HTMLInputElement | null;
                        input?.click();
                      }, 0);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Browse Files
                  </Button>
                </div>
              </div>
            )}

            {genericUploadStatus === 'success' && (
              <div className="space-y-4">

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className={`grid gap-3 ${genericExcelTabs.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    
      
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">Copy this Project</p>
                      <Select
                        value={genericBaseProjectId}
                        onValueChange={(v) => {
                          setGenericBaseProjectTouched(true);
                          setGenericBaseProjectId(v);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {templateUploadProjects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {genericExcelTabs.length > 1 && (
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-2">Select Subsheet</p>
                        <Select value={genericSelectedTab} onValueChange={handleGenericTabChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a sheet" />
                          </SelectTrigger>
                          <SelectContent>
                            {genericExcelTabs.map((tabName) => (
                              <SelectItem key={tabName} value={tabName}>
                                {tabName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">Invoice Date</p>
                      <Popover open={genericInvoiceDateOpen} onOpenChange={setGenericInvoiceDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-sm"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(genericInvoiceDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 z-[9999]"
                          align="start"
                          side="bottom"
                          sideOffset={5}
                        >
                          <div
                            style={{ pointerEvents: 'auto' }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                          >
                            <Calendar
                              mode="single"
                              selected={genericInvoiceDate}
                              onSelect={(date) => {
                                if (date) {
                                  setGenericInvoiceDate(date);
                                  setGenericInvoiceDateOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-700 mb-3">Preview</h5>
                      <div>
                        {(() => {

                          const renderTable = (stripped: { headers: string[]; rows: string[][] }) => {
                            const headerCells = [...stripped.headers];
                            const metaTotalRow = stripped.rows.find((r) => isGenericTotalMetaRow(r));
                            const metaTotalValue = metaTotalRow ? String(metaTotalRow?.[1] ?? '').trim() : '';
                            const tableRows = stripped.rows.filter((r) => !isGenericTotalMetaRow(r));

                            const isNumericLike = (v: string) => {
                              const raw = String(v ?? '').trim();
                              if (!raw) return false;
                              const cleaned = raw.replace(/[^0-9,.-]/g, '');
                              if (!cleaned) return false;
                              return /^-?\d+(?:[.,]\d+)?$/.test(cleaned.replace(/,/g, ''));
                            };

                            const numericCols = headerCells.map((_, colIndex) => {
                              let seen = 0;
                              let numeric = 0;
                              for (let r = 0; r < Math.min(50, tableRows.length); r++) {
                                const cell = String(tableRows[r]?.[colIndex] ?? '').trim();
                                if (!cell) continue;
                                seen++;
                                if (isNumericLike(cell)) numeric++;
                              }
                              if (seen === 0) return false;
                              return numeric / seen >= 0.7;
                            });

                            return (
                              <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden table-fixed">
                                <thead>
                                  <tr className="bg-gray-100 text-gray-700">
                                    {headerCells.map((h, i) => (
                                      <th
                                        key={i}
                                        className={`px-2 py-2 border-b border-gray-200 font-medium uppercase text-[10px] break-words ${numericCols[i] ? 'text-right tabular-nums' : 'text-left'}`}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {tableRows.slice(0, 25).map((row, rowIndex) => (
                                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      {row.slice(0, headerCells.length).map((value, colIndex) => (
                                        <td
                                          key={colIndex}
                                          className={`px-2 py-2 text-gray-700 break-words align-top ${numericCols[colIndex] ? 'text-right tabular-nums' : 'text-left'}`}
                                        >
                                          {value}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                                {metaTotalValue && headerCells.length > 0 && (
                                  <tfoot>
                                    <tr className="bg-gray-100">
                                      {headerCells.length === 1 ? (
                                        <td className="px-2 py-2 text-right font-semibold text-gray-900 border-t border-gray-200 tabular-nums">
                                          Total: {metaTotalValue}
                                        </td>
                                      ) : (
                                        <>
                                          <td
                                            colSpan={headerCells.length - 1}
                                            className="px-2 py-2 text-right font-medium text-gray-700 border-t border-gray-200"
                                          >
                                            Total:
                                          </td>
                                          <td className="px-2 py-2 text-right font-semibold text-gray-900 border-t border-gray-200 tabular-nums">
                                            {metaTotalValue}
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            );
                          };

                          const previewData = { headers: genericHeaders, rows: genericRows };
                          
                          return (
                            <>
                              {renderTable(previewData)}
                              {previewData.rows.length > 25 && (
                                <p className="mt-2 text-xs text-gray-500">Showing first 25 rows</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProjectCopy}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      genericIsCreatingCopy ||
                      projects.length === 0 ||
                      !genericBaseProjectId ||
                      !templateUploadProjects.some((p) => p.id === genericBaseProjectId)
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {genericIsCreatingCopy
                      ? 'Creating...'
                      : 'Create Project Copy'}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
