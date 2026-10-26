import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REGEX } from '@/constants/regex';
import { Label } from "@/components/ui/label";
import { MAJOR_CURRENCY_OPTIONS } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { DEFAULTS, ROUTES } from '@/constants';
import { AGREEMENT_TYPES, TAX_ID_TYPES } from '@/constants/options';
import { MESSAGES } from '@/constants/messages';

interface ProjectFormData {
  name: string;
  description?: string;
  uniqueProjectIdentifier: string;
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  email: string;
  phoneNumber?: string;
  agreementType: 'SOW' | 'MSA';
  agreementRef: string;
  poNumber?: string;
  invoicePurpose: string;
  currency: string;
  taxIdentificationType?: 'VAT' | 'FISCAL_ID';
  taxNumber?: string;
  status: 'active' | 'completed' | 'draft';
  paymentDueDays: string; // required, numeric string
}

interface FormErrors {
  name?: string;
  customerName?: string;
  customerAddress?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  agreementType?: string;
  agreementRef?: string;
  poNumber?: string;
  invoicePurpose?: string;
  currency?: string;
  taxNumber?: string;
  description?: string;
  uniqueProjectIdentifier?: string;
  paymentDueDays?: string;
}


const initialFormData: ProjectFormData = {
  name: '',
  description: '',
  uniqueProjectIdentifier: '',
  customerName: '',
  customerAddress: '',
  contactPerson: '',
  email: '',
  phoneNumber: '',
  agreementType: DEFAULTS.agreementType,
  agreementRef: '',
  poNumber: '',
  invoicePurpose: '',
  currency: DEFAULTS.currency,
  taxIdentificationType: DEFAULTS.taxIdentificationType,
  taxNumber: '',
  status: 'draft',
  paymentDueDays: String(DEFAULTS.paymentDueDays)
};

export default function AddProject() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { toast } = useToast();

  // Debug authentication state on component mount
  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast({
        title: MESSAGES.authRequired.title,
        description: MESSAGES.authRequired.description,
        variant: "destructive",
      });
      setTimeout(() => navigate(ROUTES.login), 2000);
    }
  }, [navigate, toast]);

  // Validation functions
  const validateField = (field: keyof ProjectFormData, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return MESSAGES.projectName;
        if (value.trim().length < 2) return MESSAGES.projectNameMinLength;
        break;
      case 'uniqueProjectIdentifier':
        if (!value.trim()) return MESSAGES.uniqueProjectIdentifier;
        if (!REGEX.PROJECT_IDENTIFIER.test(value.trim())) return MESSAGES.uniqueProjectIdentifierValidation;
        break;
      
      case 'customerName':
        if (!value.trim()) return MESSAGES.customerName;
        if (value.trim().length < 2) return MESSAGES.customerNameMinLength;
        // Check if customerName is only numbers or special characters
        if (REGEX.ONLY_NUMBERS.test(value.trim())) return MESSAGES.customerNameCannotBeOnlyNumbers;
        if (!REGEX.CONTAINS_LETTER.test(value)) return MESSAGES.customerNameMustContainAtLeastOneLetter;
        break;
      
      case 'customerAddress':
        if (!value.trim()) return MESSAGES.customerAddress;
        if (value.trim().length < 5) return MESSAGES.customerAddressMinLength;
        break;
      
      case 'contactPerson': {
        const trimmed = value.trim();
        if (!trimmed) return MESSAGES.contactPerson;
        if (trimmed.length < 2) return MESSAGES.contactPersonMinLength;
        if (REGEX.ONLY_NUMBERS.test(trimmed)) return MESSAGES.contactPersonCannotBeOnlyNumbers;
        if (!REGEX.CONTAINS_LETTER.test(trimmed)) return MESSAGES.contactPersonMustContainAtLeastOneLetter;
        break;
      }
      
      case 'email': {
        if (!value.trim()) return MESSAGES.customerEmail;
        if (!REGEX.EMAIL.test(value)) return MESSAGES.customerEmailValidation;
        break;
      }
      case 'phoneNumber':
        // Optional; validate only if provided
        if (value.trim()) {
          // Allow digits, spaces, hyphens, parentheses, leading plus
          const phoneRegex = /^[+]?[-()\s0-9]{7,}$/;
          if (!phoneRegex.test(value.trim())) return MESSAGES.phoneNumber;
        }
        break;
      
      case 'invoicePurpose':
        if (!value.trim()) return MESSAGES.invoicePurpose;
        if (value.trim().length < 5) return MESSAGES.invoicePurposeMinLength;
        break;
      
      case 'currency':
        if (!value) return MESSAGES.currency;
        break;
      case 'agreementType':
        if (!value) return MESSAGES.agreementType;
        if (value !== 'SOW' && value !== 'MSA') return MESSAGES.agreementType;
        break;
      case 'agreementRef':
        if (!value.trim()) return MESSAGES.agreementRef;
        if (value.trim().length < 3) return MESSAGES.agreementRefMinLength;
        break;
      
      case 'poNumber':
        // Optional field, but if provided should have minimum length
        if (value.trim() && value.trim().length < 3) return MESSAGES.poNumber;
        break;
      
      case 'description':
        // Optional field, but if provided should have minimum length
        if (value.trim() && value.trim().length < 5) return MESSAGES.description;
        break;
      case 'paymentDueDays':
        // Required numeric field, must be a non-negative integer
        if (!value) return MESSAGES.paymentDueDays;
        if (!REGEX.POSITIVE_INTEGER.test(value)) return MESSAGES.paymentDueDaysInvalid;
        if (parseInt(value, 10) < 0) return MESSAGES.paymentDueDaysMinValue;
        break;
      case 'taxNumber':
        // Optional; validate only if provided
        if (value && value.trim().length < 2) return MESSAGES.taxNumberMinLength;
        break;
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach((key) => {
      const field = key as keyof ProjectFormData;
      const value = formData[field] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
    
    // Validate field in real-time if it has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }));
    }
  };

  const handleFieldBlur = (field: keyof ProjectFormData) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    
    const value = formData[field] || '';
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitAttempted(true);
    const allFields = Object.keys(formData) as (keyof ProjectFormData)[];
    setTouched(prev => {
      const newTouched = { ...prev };
      allFields.forEach(field => {
        newTouched[field] = true;
      });
      return newTouched;
    });
  
    if (!validateForm()) {
      toast({
        title: MESSAGES.validationError.title,
        description: MESSAGES.validationError.description,
        variant: "destructive",
      });
      return;
    }
  
    setIsSubmitting(true); // Disable the button
  
    try {
      const projectData = {
        ...formData,
        description: formData.description || '',
        paymentDueDays: formData.paymentDueDays ? parseInt(formData.paymentDueDays, 10) : undefined,
        taxIdentificationType: formData.taxIdentificationType,
        taxNumber: formData.taxNumber || undefined,
      };
  
      await createProject.mutateAsync(projectData);
  
      toast({
        title: MESSAGES.projectCreated.title,
        description: MESSAGES.projectCreated.description,
        variant: "success",
      });

      navigate(ROUTES.index);
    } catch (error) {
      console.error('Error creating project:', error);
  
      let errorMessage = undefined as string | undefined;
      
      if (error?.response?.status === 401) {
        errorMessage = MESSAGES.authFailed;
        localStorage.removeItem('auth_token');
        setTimeout(() => window.location.href = ROUTES.login, 2000);
      } else if (error?.response?.status === 403) {
        errorMessage = MESSAGES.noPermission;
      } else if (error?.response?.status === 409) {
        errorMessage = error?.response?.data?.error || MESSAGES.duplicateUPI;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      const msg = MESSAGES.projectCreateFailed(errorMessage);
      toast({
        title: msg.title,
        description: msg.description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); // Re-enable the button
    }
  };
  

  return (
    <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Link>
        <Card className="group flex flex-col h-[calc(100vh-8rem)] overflow-hidden rounded-sm border border-gray-200 shadow-md bg-white relative">
          {/* Top accent light bar - made more visible */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/60 absolute top-0 left-0 right-0 z-10" />
          
          {/* Fixed Header */}
          <div className="px-6 pt-4 pb-2 bg-white border-b sticky top-0">
            <h2 className="text-xl font-semibold text-gray-900 py-1">Create New Project</h2>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-6">
            <form id="project-form" onSubmit={handleSubmit} className="space-y-6 py-4">
              {/* Project Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-500 border-b pb-1 pt-1">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="projectName" className="font-medium">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onBlur={() => handleFieldBlur('name')}
                      placeholder="e.g., Invoice Generator"
                      required
                      maxLength={255}
                      className={`mt-1 ${submitAttempted && errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description" className="font-medium">Description</Label>
                    <Input
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      onBlur={() => handleFieldBlur('description')}
                      placeholder="Optional project description"
                      maxLength={500}
                      className={`mt-1 ${submitAttempted && errors.description ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>
                  <div>
                    <Label htmlFor="uniqueProjectIdentifier" className="font-medium">Unique Project Identifier *</Label>
                    <Input
                      id="uniqueProjectIdentifier"
                      value={formData.uniqueProjectIdentifier}
                      onChange={(e) => handleInputChange('uniqueProjectIdentifier', e.target.value)}
                      onBlur={() => handleFieldBlur('uniqueProjectIdentifier')}
                      placeholder="e.g., WEST"
                      required
                      className={`mt-1 ${submitAttempted && errors.uniqueProjectIdentifier ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.uniqueProjectIdentifier && <p className="text-red-500 text-sm mt-1">{errors.uniqueProjectIdentifier}</p>}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-500 border-b pb-1">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="customerName" className="font-medium">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      onBlur={() => handleFieldBlur('customerName')}
                      placeholder="e.g., ABC Corp"
                      required
                      maxLength={255}
                      className={`mt-1 ${submitAttempted && errors.customerName ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactPerson" className="font-medium">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                      onBlur={() => handleFieldBlur('contactPerson')}
                      placeholder="e.g., Andy Sorowsky"
                      required
                      className={`mt-1 ${submitAttempted && errors.contactPerson ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.contactPerson && <p className="text-red-500 text-sm mt-1">{errors.contactPerson}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email" className="font-medium">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder="e.g., contact@abccorp.com"
                      required
                      className={`mt-1 ${submitAttempted && errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="phoneNumber" className="font-medium">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      onBlur={() => handleFieldBlur('phoneNumber')}
                      placeholder="e.g., +1 555 123 4567"
                      className={`mt-1 ${submitAttempted && errors.phoneNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
                  </div>
                  <div>
                    <Label htmlFor="taxIdentificationType" className="font-medium">Tax Identification Type</Label>
                    <Select
                      value={formData.taxIdentificationType}
                      onValueChange={(value) => {
                        handleInputChange('taxIdentificationType', value);
                        handleFieldBlur('taxIdentificationType' as keyof ProjectFormData);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_ID_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t === 'FISCAL_ID' ? 'Fiscal ID' : 'VAT'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="taxNumber" className="font-medium">{formData.taxIdentificationType === 'FISCAL_ID' ? 'Fiscal ID' : 'VAT Number'}</Label>
                    <Input
                      id="taxNumber"
                      value={formData.taxNumber || ''}
                      onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                      onBlur={() => handleFieldBlur('taxNumber')}
                      placeholder={formData.taxIdentificationType === 'FISCAL_ID' ? 'Enter Fiscal ID' : 'Enter VAT number'}
                      className={`mt-1 ${submitAttempted && errors.taxNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.taxNumber && <p className="text-red-500 text-sm mt-1">{errors.taxNumber}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                    <Label htmlFor="customerAddress" className="font-medium">Customer Address *</Label>
                    <Input
                      id="customerAddress"
                      value={formData.customerAddress}
                      onChange={(e) => handleInputChange('customerAddress', e.target.value)}
                      onBlur={() => handleFieldBlur('customerAddress')}
                      placeholder="e.g., 221 Baker Street London 12345"
                      required
                      maxLength={500}
                      className={`mt-1 ${submitAttempted && errors.customerAddress ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.customerAddress && <p className="text-red-500 text-sm mt-1">{errors.customerAddress}</p>}
                  </div>
              </div>

              {/* Invoice Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-500 border-b pb-1">Invoice Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="currency" className="font-medium">Currency *</Label>
                    <Select 
                      value={formData.currency}
                      onValueChange={(value) => {
                        handleInputChange('currency', value);
                        handleFieldBlur('currency');
                      }}
                    >
                      <SelectTrigger className={`mt-1 ${submitAttempted && errors.currency ? 'border-red-500 focus:border-red-500' : ''}`}>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {MAJOR_CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {submitAttempted && errors.currency && <p className="text-red-500 text-sm mt-1">{errors.currency}</p>}
                  </div>
                  <div>
                    <Label htmlFor="poNumber" className="font-medium">PO Number</Label>
                    <Input
                      id="poNumber"
                      value={formData.poNumber}
                      onChange={(e) => handleInputChange('poNumber', e.target.value)}
                      onBlur={() => handleFieldBlur('poNumber')}
                      placeholder="Purchase Order Number"
                      className={`mt-1 ${submitAttempted && errors.poNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.poNumber && <p className="text-red-500 text-sm mt-1">{errors.poNumber}</p>}
                  </div>
                  <div>
                    <Label htmlFor="paymentDueDays" className="font-medium">Net Term *</Label>
                    <Input
                      id="paymentDueDays"
                      type="number"
                      value={formData.paymentDueDays}
                      onChange={(e) => handleInputChange('paymentDueDays', e.target.value)}
                      onBlur={() => handleFieldBlur('paymentDueDays')}
                      placeholder="Payment due days"
                      className={`mt-1 ${submitAttempted && errors.paymentDueDays ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.paymentDueDays && <p className="text-red-500 text-sm mt-1">{errors.paymentDueDays}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="agreementType" className="font-medium">Agreement Type *</Label>
                    <Select 
                      value={formData.agreementType}
                      onValueChange={(value) => {
                        handleInputChange('agreementType', value);
                        handleFieldBlur('agreementType');
                      }}
                    >
                      <SelectTrigger className={`mt-1 ${submitAttempted && errors.agreementType ? 'border-red-500 focus:border-red-500' : ''}`}>
                        <SelectValue placeholder="Select agreement type" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGREEMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {submitAttempted && errors.agreementType && <p className="text-red-500 text-sm mt-1">{errors.agreementType}</p>}
                  </div>
                  <div>
                    <Label htmlFor="agreementRef" className="font-medium">{formData.agreementType === 'SOW' ? 'SOW Reference *' : 'MSA Reference *'}</Label>
                    <Input
                      id="agreementRef"
                      value={formData.agreementRef}
                      onChange={(e) => handleInputChange('agreementRef', e.target.value)}
                      onBlur={() => handleFieldBlur('agreementRef')}
                      placeholder={formData.agreementType === 'MSA' ? 'MSA Reference' : 'SOW Reference'}
                      maxLength={100}
                      className={`mt-1 ${submitAttempted && errors.agreementRef ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.agreementRef && <p className="text-red-500 text-sm mt-1">{errors.agreementRef}</p>}
                  </div>
                  <div>
                    <Label htmlFor="invoicePurpose" className="font-medium">Invoice Purpose *</Label>
                    <Input
                      id="invoicePurpose"
                      value={formData.invoicePurpose}
                      onChange={(e) => handleInputChange('invoicePurpose', e.target.value)}
                      onBlur={() => handleFieldBlur('invoicePurpose')}
                      placeholder="e.g., Software service provided to ABC Corp"
                      required
                      maxLength={255}
                      className={`mt-1 ${submitAttempted && errors.invoicePurpose ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    {submitAttempted && errors.invoicePurpose && <p className="text-red-500 text-sm mt-1">{errors.invoicePurpose}</p>}
                  </div>
                </div>
              </div>

            </form>
          </div>
          
          {/* Fixed Submit Button */}
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
            <div className="flex justify-end">
              <Button
                type="submit"
                form="project-form"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium transition-colors duration-200 ease-in-out bg-primary hover:bg-primary/90 text-white rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-primary/70"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Project...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Create Project
                  </span>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
