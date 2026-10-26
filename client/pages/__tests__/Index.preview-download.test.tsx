/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// SUT
import Index from '../Index';

// Mocks
const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockExport = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'p1',
        name: 'Project One',
        customerName: 'Customer A',
        currency: 'USD',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useDeleteProject: () => ({
    mutateAsync: vi.fn(),
  }),
  useProject: () => ({
    data: {
      id: 'p1',
      name: 'Project One',
      customerName: 'Customer A',
      currency: 'USD',
      invoiceNumber: 'INV-001',
    },
    isLoading: false,
    error: null,
  }),
  useUpdateProject: () => ({ mutateAsync: vi.fn() }),
  useCreateProject: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../../contexts/TemplateContext', () => ({
  useTemplate: () => ({ selectedTemplate: { name: 'Simple' } }),
}));

vi.mock('@/lib/pdfExport', () => ({
  exportInvoiceToPDF: (...args: any[]) => mockExport(...args),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Avoid heavy template rendering during download
vi.mock('../../components/templates/SimpleTemplateRenderer', () => ({
  __esModule: true,
  default: ({ project }: any) => <div data-testid="simple-template-stub">Template for {project?.name}</div>,
}));

// Mock heavy components imported by Index using correct absolute paths from pages directory
vi.mock('../../components/excel/ExcelUploadModal', () => ({
  __esModule: true,
  default: ({ open }: any) => (open ? <div>Excel Upload Modal</div> : null),
}));
vi.mock('../../components/projects/EditProjectModal', () => ({
  __esModule: true,
  default: ({ open }: any) => (open ? <div>Edit Project Modal</div> : null),
}));

// Stub xlsx to prevent loading the heavy dependency graph
vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(() => [[]]),
  },
  writeFile: vi.fn(),
  read: vi.fn(() => ({ SheetNames: ['Employee Data'], Sheets: {} })),
}));

// Light-weight icon mocks
vi.mock('lucide-react', () => {
  const Icon = (props: any) => <svg data-testid="icon" {...props} />;
  return {
    __esModule: true,
    // Icons used in Index
    Plus: Icon,
    Eye: Icon,
    Download: Icon,
    Upload: Icon,
    Pen: Icon,
    Trash2: Icon,
    // Icons used in ExcelUploadModal
    FileSpreadsheet: Icon,
    CheckCircle: Icon,
    AlertCircle: Icon,
    Users: Icon,
    Building: Icon,
    // Utility X icon
    X: Icon,
  };
});

describe.sequential('Index page preview and download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Index />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('navigates to Preview page when clicking Preview', async () => {
    setup();

    const previewBtn = await screen.findByRole('button', { name: /preview/i });
    await userEvent.click(previewBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/preview/p1');
  });

  it('downloads invoice when clicking Download and shows success toast', async () => {
    setup();

    const downloadBtn = await screen.findByRole('button', { name: /download/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    expect(mockExport).toHaveBeenCalledWith('p1');

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    const toastArg = mockToast.mock.calls.at(-1)?.[0];
    expect(toastArg.title).toMatch(/pdf export successful/i);
    expect(toastArg.description).toMatch(/invoice downloaded/i);
  });
});
