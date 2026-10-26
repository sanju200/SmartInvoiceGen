export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'invoice' | 'report' | 'statement';
  preview?: string;
}

export interface InvoiceTemplate extends Template {
  category: 'invoice';
  layout: 'standard' | 'modern' | 'minimal' | 'corporate';
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  fonts: {
    header: string;
    body: string;
  };
  features: {
    showLogo: boolean;
    showBorder: boolean;
    showWatermark: boolean;
    headerStyle: 'full' | 'compact' | 'split';
    tableStyle: 'standard' | 'striped' | 'minimal';
  };
}

export const AVAILABLE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Professional',
    description: 'Clean and professional layout with company branding',
    category: 'invoice',
    layout: 'standard',
    colors: {
      primary: '#f97316', // Orange
      secondary: '#fed7aa', // Light orange
      text: '#1f2937', // Dark gray (minimal black)
      background: '#ffffff' // White
    },
    fonts: {
      header: 'Arial, sans-serif',
      body: 'Arial, sans-serif'
    },
    features: {
      showLogo: true,
      showBorder: true,
      showWatermark: false,
      headerStyle: 'full',
      tableStyle: 'standard'
    }
  },
  {
    id: 'modern',
    name: 'Modern Gradient',
    description: 'Contemporary design with gradient accents and modern typography',
    category: 'invoice',
    layout: 'modern',
    colors: {
      primary: '#f97316', // Orange
      secondary: '#fed7aa', // Light orange
      text: '#1f2937', // Dark gray (minimal black)
      background: '#ffffff' // White
    },
    fonts: {
      header: 'Helvetica, sans-serif',
      body: 'Helvetica, sans-serif'
    },
    features: {
      showLogo: true,
      showBorder: false,
      showWatermark: false,
      headerStyle: 'split',
      tableStyle: 'striped'
    }
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Minimal design focusing on simplicity and readability',
    category: 'invoice',
    layout: 'minimal',
    colors: {
      primary: '#f97316', // Orange
      secondary: '#fed7aa', // Light orange
      text: '#1f2937', // Dark gray (minimal black)
      background: '#ffffff' // White
    },
    fonts: {
      header: 'Georgia, serif',
      body: 'Georgia, serif'
    },
    features: {
      showLogo: true,
      showBorder: false,
      showWatermark: false,
      headerStyle: 'compact',
      tableStyle: 'minimal'
    }
  },
  {
    id: 'corporate',
    name: 'Corporate Orange',
    description: 'Traditional corporate styling with professional orange theme',
    category: 'invoice',
    layout: 'corporate',
    colors: {
      primary: '#f97316', // Orange
      secondary: '#fed7aa', // Light orange
      text: '#1f2937', // Dark gray (minimal black)
      background: '#ffffff' // White
    },
    fonts: {
      header: 'Times New Roman, serif',
      body: 'Times New Roman, serif'
    },
    features: {
      showLogo: true,
      showBorder: true,
      showWatermark: true,
      headerStyle: 'full',
      tableStyle: 'standard'
    }
  }
];

export function getTemplateById(id: string): InvoiceTemplate | undefined {
  return AVAILABLE_TEMPLATES.find(template => template.id === id);
}

export function getTemplatesByCategory(category: Template['category']): InvoiceTemplate[] {
  return AVAILABLE_TEMPLATES.filter(template => template.category === category);
}
