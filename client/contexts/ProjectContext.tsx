import React, { createContext, useContext, useState, ReactNode } from 'react';

// Dynamic calculation for current month's last date
const getLastDateOfCurrentMonth = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  // Format as YYYY-MM-DD
  const year = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPaymentDueDate = (invoiceDate: string): string => {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + 15);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthYear = (): string => {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();
  return `${month} ${year}`;
};

const generateInvoiceNumber = (uniqueProjectIdentifier: string): string => {
  const currentDate = new Date();
  const month = currentDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = currentDate.getFullYear().toString().slice(-2);
  return `INVOICE-${uniqueProjectIdentifier}-${month}${year}`;
};

export interface Employee {
  id: string;
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  uniqueProjectIdentifier: string;
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  email: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentDueDate: string;
  workPeriod: string;
  agreementType: 'SOW' | 'MSA';
  agreementRef: string;
  poNumber: string;
  invoicePurpose: string;
  currency: string;
  employees?: Employee[];
  totalAmount: number;
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextType {
  projects: Project[];
  getProject: (id: string) => Project | undefined;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Mock data
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'West Horminics',
    uniqueProjectIdentifier: 'WH-2025-08',
    customerName: 'ABC Corp',
    customerAddress: '221 Baker Street London 12345',
    contactPerson: 'Andy Sorowsky',
    email: 'Andys@abccorp.sd',
    invoiceNumber: generateInvoiceNumber('WH-2025-08'),
    invoiceDate: getLastDateOfCurrentMonth(),
    paymentDueDate: getPaymentDueDate(getLastDateOfCurrentMonth()),
    workPeriod: getCurrentMonthYear(),
    agreementType: 'SOW',
    agreementRef: 'Professional Services Agreement',
    poNumber: '',
    invoicePurpose: 'Software service provided to ABC Corp',
    currency: 'EUR',
    employees: [],
    totalAmount: 5160.00,
    status: 'active',
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-09-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'East Analytics',
    uniqueProjectIdentifier: 'EA-2024-10',
    customerName: 'XYZ Ltd',
    customerAddress: '456 Analytics Avenue, Tech City 67890',
    contactPerson: 'Sarah Johnson',
    email: 'sarah@xyzltd.com',
    invoiceNumber: generateInvoiceNumber('EA-2024-10'),
    invoiceDate: getLastDateOfCurrentMonth(),
    paymentDueDate: getPaymentDueDate(getLastDateOfCurrentMonth()),
    workPeriod: getCurrentMonthYear(),
    agreementType: 'MSA',
    agreementRef: 'MSA-2024-001',
    poNumber: 'PO-2024-001',
    invoicePurpose: 'Analytics and reporting services provided to XYZ Ltd',
    currency: 'EUR',
    employees: [],
    totalAmount: 2590.00,
    status: 'completed',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-10-31T00:00:00Z'
  },
  {
    id: '3',
    name: 'North Platform',
    uniqueProjectIdentifier: 'NP-2024-11',
    customerName: 'TechCorp',
    customerAddress: '789 Platform Street, Cloud City 11223',
    contactPerson: 'Mike Wilson',
    email: 'mike@techcorp.io',
    invoiceNumber: generateInvoiceNumber('NP-2024-11'),
    invoiceDate: getLastDateOfCurrentMonth(),
    paymentDueDate: getPaymentDueDate(getLastDateOfCurrentMonth()),
    workPeriod: getCurrentMonthYear(),
    agreementType: 'SOW',
    agreementRef: 'Platform Development Agreement',
    poNumber: '',
    invoicePurpose: 'Cloud platform development services provided to TechCorp',
    currency: 'USD',
    employees: [],
    totalAmount: 0,
    status: 'draft',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z'
  }
];

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(mockProjects);

  const getProject = (id: string): Project | undefined => {
    return projects.find(project => project.id === id);
  };

  const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === id 
          ? { ...project, ...updates, updatedAt: new Date().toISOString() }
          : project
      )
    );
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(project => project.id !== id));
  };

  const value: ProjectContextType = {
    projects,
    getProject,
    addProject,
    updateProject,
    deleteProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
