import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AVAILABLE_TEMPLATES, InvoiceTemplate, getTemplateById } from '../types/templates';

interface TemplateContextType {
  selectedTemplate: InvoiceTemplate;
  setSelectedTemplate: (template: InvoiceTemplate) => void;
  selectTemplateById: (templateId: string) => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const [selectedTemplate, setSelectedTemplateState] = useState<InvoiceTemplate>(AVAILABLE_TEMPLATES[0]); // Default to standard

  // Load template from localStorage on mount
  useEffect(() => {
    const savedTemplateId = localStorage.getItem('selectedTemplateId');
    if (savedTemplateId) {
      const template = getTemplateById(savedTemplateId);
      if (template) {
        setSelectedTemplateState(template);
      }
    }
  }, []);

  const setSelectedTemplate = (template: InvoiceTemplate) => {
    setSelectedTemplateState(template);
    localStorage.setItem('selectedTemplateId', template.id);
  };

  const selectTemplateById = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  };

  const value: TemplateContextType = {
    selectedTemplate,
    setSelectedTemplate,
    selectTemplateById,
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate() {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplate must be used within a TemplateProvider');
  }
  return context;
}
