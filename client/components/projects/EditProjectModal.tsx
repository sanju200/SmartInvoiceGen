import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent, DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAJOR_CURRENCY_OPTIONS } from '@/lib/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { useProject, useUpdateProject } from '../../hooks/useProjects';
import { useToast } from '@/hooks/use-toast';
import { MESSAGES } from '@/constants/messages';
import { REGEX } from '@/constants/regex';

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
}

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
  poNumber: string;
  invoicePurpose: string;
  currency: string;
  taxIdentificationType?: 'VAT' | 'FISCAL_ID';
  taxNumber?: string;
  status: string;
  paymentDueDays?: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  uniqueProjectIdentifier?: string;
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
  vatPercentage?: number;
  taxNumber?: string;
  paymentDueDays?: string;
}

export default function EditProjectModal({ open, onOpenChange, projectId }: EditProjectModalProps) {
  const { data: project, isLoading } = useProject(projectId || '');
  const updateProjectMutation = useUpdateProject();
  const [formData, setFormData] = useState<ProjectFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load project data when project is fetched
  useEffect(() => {
    if (project && open) {
      // Normalize agreement type to supported values
      const rawAgreementType = (project.agreementType as unknown as string) || 'SOW';
      const upperAgreementType = rawAgreementType.toString().toUpperCase();
      const normalizedAgreementType: 'SOW' | 'MSA' = upperAgreementType === 'MSA' ? 'MSA' : 'SOW';

      setFormData({
        name: project.name,
        description: project.description || '',
        uniqueProjectIdentifier: project.uniqueProjectIdentifier || '',
        customerName: project.customerName,
        customerAddress: project.customerAddress || '',
        contactPerson: project.contactPerson || '',
        email: project.email || '',
        phoneNumber: project.phoneNumber || '',
        agreementType: normalizedAgreementType,
        agreementRef: project.agreementRef || '',
        poNumber: project.poNumber || '',
        invoicePurpose: project.invoicePurpose || '',
        currency: project.currency,
        taxIdentificationType: project.taxIdentificationType || 'VAT',
        taxNumber: project.taxNumber || '',
        status: project.status,
        paymentDueDays: typeof project.paymentDueDays === 'number' ? String(project.paymentDueDays) : '15'
      });
      // Reset validation state when opening modal
      setErrors({});
      setTouched({});
      setSubmitAttempted(false);
    } else if (!open) {
      setFormData(null);
      setErrors({});
      setTouched({});
      setSubmitAttempted(false);
    }
  }, [project, open]);

  // Fix for pointer-events issue - ensure body pointer events are restored
  useEffect(() => {
    if (!open) {
      // Small delay to ensure Select has finished its cleanup
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Validation functions
  const validateField = (field: keyof ProjectFormData, value: string | number | undefined): string => {
    // Convert to string for string operations, but handle numbers appropriately
    const stringValue = String(value ?? '');
    
    switch (field) {
      case 'name':
        if (!stringValue.trim()) return MESSAGES.projectName;
        if (stringValue.trim().length < 2) return MESSAGES.projectNameMinLength;
        break;

      case 'uniqueProjectIdentifier':
        if (!stringValue.trim()) return MESSAGES.uniqueProjectIdentifier;
        break;

      case 'description':
        // optional: no strict rules for now
        break;

      case 'customerName':
        if (!stringValue.trim()) return MESSAGES.customerName;
        if (stringValue.trim().length < 2) return MESSAGES.customerNameMinLength;
        // Check if customerName is only numbers or special characters
        if (REGEX.ONLY_NUMBERS.test(stringValue.trim())) return MESSAGES.customerNameCannotBeOnlyNumbers;
        if (!REGEX.CONTAINS_LETTER.test(stringValue)) return MESSAGES.customerNameMustContainAtLeastOneLetter;
        break;

      case 'customerAddress':
        if (!stringValue.trim()) return MESSAGES.customerAddress;
        if (stringValue.trim().length < 5) return MESSAGES.customerAddressMinLength;
        break;

      case 'contactPerson':
        if (!stringValue.trim()) return MESSAGES.contactPerson;
        if (stringValue.trim().length < 2) return MESSAGES.contactPersonMinLength;
        if (REGEX.ONLY_NUMBERS.test(stringValue.trim())) return MESSAGES.contactPersonCannotBeOnlyNumbers;
        if (!REGEX.CONTAINS_LETTER.test(stringValue)) return MESSAGES.contactPersonMustContainAtLeastOneLetter;
        break;

      case 'email': {
        if (!stringValue.trim()) return MESSAGES.customerEmail;
        if (!REGEX.EMAIL.test(stringValue)) return MESSAGES.customerEmailValidation;
        break;
      }

      case 'phoneNumber': {
        // Optional; validate only if provided
        if (stringValue.trim()) {
          const phoneRegex = /^[+]?[-()\s0-9]{7,}$/;
          if (!phoneRegex.test(stringValue.trim())) return MESSAGES.phoneNumber;
        }
        break;
      }

      case 'invoicePurpose':
        if (!stringValue.trim()) return MESSAGES.invoicePurpose;
        if (stringValue.trim().length < 5) return MESSAGES.invoicePurposeMinLength;
        break;

      case 'currency':
        if (!stringValue) return MESSAGES.currency;
        break;

      case 'paymentDueDays':
        if (!stringValue) return MESSAGES.paymentDueDays;
        if (!REGEX.POSITIVE_INTEGER.test(stringValue)) return MESSAGES.paymentDueDaysInvalid;
        if (parseInt(stringValue, 10) < 0) return MESSAGES.paymentDueDaysMinValue;
        break;

      case 'agreementType':
        if (!stringValue) return MESSAGES.agreementType;
        if (stringValue !== 'SOW' && stringValue !== 'MSA') return MESSAGES.agreementType;
        break;
      case 'agreementRef':
        if (!stringValue.trim()) return MESSAGES.agreementRef;
        if (stringValue.trim().length < 3) return MESSAGES.agreementRefMinLength;
        break;

      case 'poNumber':
        // Optional field, but if provided should have minimum length
        if (stringValue.trim() && stringValue.trim().length < 3) return MESSAGES.poNumberMinLength;
        break;
      case 'taxNumber':
        // Optional; validate only if provided
        if (stringValue && stringValue.trim().length < 2) return MESSAGES.taxNumberMinLength;
        break;
    }
    return '';
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: FormErrors = {};

    // Validate all fields
    Object.keys(formData).forEach((key) => {
      const field = key as keyof ProjectFormData;
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    if (!formData) return;

    // Convert value to appropriate type based on field
    const processedValue: string = value;

    setFormData(prev => prev ? ({
      ...prev,
      [field]: processedValue
    }) : null);

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Validate field in real-time if it has been touched
    if (touched[field]) {
      const error = validateField(field, processedValue);
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

    if (formData) {
      const error = validateField(field, formData[field]);
      setErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !projectId) return;

    // Mark submit attempted so errors show after submit
    setSubmitAttempted(true);
    // Mark all fields as touched to compute validation errors
    const allFields = Object.keys(formData) as (keyof ProjectFormData)[];
    setTouched(prev => {
      const newTouched = { ...prev };
      allFields.forEach(field => {
        newTouched[field] = true;
      });
      return newTouched;
    });

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { paymentDueDays, ...rest } = formData;
      const projectUpdates: Omit<ProjectFormData, 'paymentDueDays'> & { 
        paymentDueDays?: number;
        description: string;
      } = {
        ...rest,
        description: rest.description || '',
        paymentDueDays: paymentDueDays ? parseInt(paymentDueDays, 10) : undefined,
      };
      await updateProjectMutation.mutateAsync({ id: projectId, data: projectUpdates });
      toast({
        title: "Success",
        description: "Project updated successfully.",
        variant: 'success'
      });

      // Close modal
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Failed to update project",
        description: error?.response?.data?.message || error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!projectId || !open) {
    return null;
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Project</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading project...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!formData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Loading Project</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-600">Project not found or failed to load.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-0" ref={dialogRef}>
        <DialogHeader className="flex-shrink-0 bg-white">
          <div className="px-4 pt-4">
            <DialogTitle className="text-xl font-semibold text-gray-900">Edit Project</DialogTitle>
          </div>
          <div className="w-full border-b mt-4"></div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-6 px-4 pb-4">
          {/* Project Information */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-500 border-b pb-1">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="projectName" className="font-medium">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  placeholder="e.g., West Horminics"
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
                    <SelectItem value="FISCAL_ID">Fiscal ID</SelectItem>
                    <SelectItem value="VAT">VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="taxNumber" className="font-medium">{(formData.taxIdentificationType || 'VAT') === 'FISCAL_ID' ? 'Fiscal ID' : 'VAT Number'}</Label>
                <Input
                  id="taxNumber"
                  value={formData.taxNumber || ''}
                  onChange={(e) => handleInputChange('taxNumber', e.target.value)}
                  onBlur={() => handleFieldBlur('taxNumber')}
                  placeholder={(formData.taxIdentificationType || 'VAT') === 'FISCAL_ID' ? 'Enter Fiscal ID' : 'Enter VAT number'}
                  className={`mt-1 ${submitAttempted && errors.taxNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {submitAttempted && errors.taxNumber && <p className="text-red-500 text-sm mt-1">{errors.taxNumber}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
              <div>
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
              <div></div>
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
                    <SelectItem value="SOW">SOW</SelectItem>
                    <SelectItem value="MSA">MSA</SelectItem>
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
        {/* Submit Buttons */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                form="edit-project-form"
                className="bg-primary hover:bg-orange-500"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
