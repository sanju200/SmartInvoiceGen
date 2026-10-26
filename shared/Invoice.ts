export interface Employee {
  id: string;
  name: string;
  ratePerHour: number;
  hours: number;
  total: number;
}

export interface Project {
  id: string;
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  email: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentDueDate: string;
  sowRef: string;
  invoicePurpose: string;
  workPeriod: string;
  currency: string;
  employees: Employee[];
  vat: string;
  poNumber: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  fonts: {
    header: string;
    body: string;
  };
}

export const defaultTemplate: InvoiceTemplate = {
  id: "kizora-template",
  name: "Kizora Template",
  colors: {
    primary: "#f97316",
    secondary: "#d9dbdd", 
    text: "#374151",
    accent: "#6b7280"
  },
  fonts: {
    header: "system-ui",
    body: "system-ui"
  }
};
;
