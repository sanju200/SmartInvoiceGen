import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface CompanyInfo {
  id?: string;
  name: string;
  address: string;
  cinNumber?: string;
  gstNumber?: string;
  ifscCode?: string;
  bankName?: string;
  bankAddress?: string;
  swiftCode?: string;
  remittingBankName?: string;
  remittingCurrency?: string;
  remittingAccountNo?: string;
  remittingSwiftCode?: string;
  remittingIbanNo?: string;
  remittingAbaFedNo?: string;
  // Signing section
  signatureImage?: string | null;
  companyStampImage?: string | null;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
}

interface FormErrors {
  name?: string;
  address?: string;
  cinNumber?: string;
  gstNumber?: string;
  ifscCode?: string;
  bankName?: string;
  bankAddress?: string;
  swiftCode?: string;
  remittingBankName?: string;
  remittingCurrency?: string;
  remittingAccountNo?: string;
  remittingSwiftCode?: string;
  remittingIbanNo?: string;
  remittingAbaFedNo?: string;
}

const CompanyInfo = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    address: "",
    cinNumber: "",
    gstNumber: "",
    ifscCode: "",
    bankName: "",
    bankAddress: "",
    swiftCode: "",
    remittingBankName: "",
    remittingCurrency: "",
    remittingAccountNo: "",
    remittingSwiftCode: "",
    remittingIbanNo: "",
    remittingAbaFedNo: "",
    signatureImage: "",
    companyStampImage: "",
    signatoryName: "",
    signatoryDesignation: "",
  });

  // Fetch existing company information
  useEffect(() => {
    if (token) {
      fetchCompanyInfo();
    }
  }, [token]);

  const fetchCompanyInfo = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/company", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Failed to fetch company information");
      }

      const data = await response.json();
      if (data) {
        setCompanyInfo({
          ...companyInfo,
          ...data,
        });
      }
      // Reset validation state when data loads
      setErrors({});
      setTouched({});
      setLoading(false);
    } catch (error) {
      console.error("Error fetching company info:", error);
      toast({
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive",
      });
      setLoadError("Failed to load company information");
      setLoading(false);
    }
  };

  // Handle image uploads as base64 data URLs
  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'signatureImage' | 'companyStampImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCompanyInfo((prev) => ({ ...prev, [field]: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (field: 'signatureImage' | 'companyStampImage') => {
    setCompanyInfo((prev) => ({ ...prev, [field]: '' }));
  };

  // Validation functions
  const validateField = (field: keyof CompanyInfo, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters';
        if (value.length > 255) return 'Company name cannot exceed 255 characters';
        if (/^\d+$/.test(value.trim())) return 'Company name cannot be only numbers';
        if (!/[a-zA-Z]/.test(value)) return 'Company name must contain at least one letter';
        break;

      case 'address':
        if (!value.trim()) return 'Company address is required';
        if (value.trim().length < 10) return 'Company address must be at least 10 characters';
        break;

      case 'cinNumber':
        if (!value.trim()) return 'CIN number is required';
        break;

      case 'gstNumber':
        if (!value.trim()) return 'GST number is required';
        break;

      case 'ifscCode':
        if (!value.trim()) return 'IFSC code is required';
        break;

      case 'bankName':
        if (!value.trim()) return 'Bank name is required';
        if (value.trim().length < 3) return 'Bank name must be at least 3 characters';
        if (/^\d+$/.test(value.trim())) return 'Bank name cannot be only numbers';
        break;

      case 'bankAddress':
        if (!value.trim()) return 'Bank address is required';
        if (value.trim().length < 10) return 'Bank address must be at least 10 characters';
        break;

      case 'swiftCode':
        if (!value.trim()) return 'SWIFT code is required';
        break;

      case 'remittingBankName':
        if (!value.trim()) return 'Remitting bank name is required';
        break;

      case 'remittingAccountNo':
        if (!value.trim()) return 'Remitting account number is required';
        break;

      case 'remittingSwiftCode':
        if (!value.trim()) return 'Remitting swift code is required';
        break;

      case 'remittingIbanNo':
        if (!value.trim()) return 'Remitting IBAN number is required';
        break;
      // Optional fields: no validation for signing section
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate all fields
    Object.keys(companyInfo).forEach((key) => {
      const field = key as keyof CompanyInfo;
      const value = companyInfo[field] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value,
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

  const handleFieldBlur = (field: keyof CompanyInfo) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    const value = companyInfo[field] || '';
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token not available. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Mark all fields as touched to show validation errors
    const allFields = Object.keys(companyInfo) as (keyof CompanyInfo)[];
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

    setSaving(true);

    try {
      const response = await fetch("/api/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(companyInfo),
      });

      if (!response.ok) {
        throw new Error("Failed to save company information");
      }

      const updatedCompany = await response.json();
      setCompanyInfo({
        ...companyInfo,
        ...updatedCompany,
      });
      toast({
        title: "Success",
        description: "Company information saved successfully",
        variant: "success"
      });
      setSaving(false);
    } catch (error) {
      console.error("Error saving company info:", error);
      toast({
        title: "Error",
        description: "Failed to save company information",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // When loadError is set, we will show an inline alert within the form instead of returning early

  return (
    <div className="min-h-[calc(100vh-var(--app-sticky-offset))] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <form onSubmit={handleSubmit} noValidate className="h-full flex flex-col">
          <Card className="group overflow-hidden rounded-sm border border-gray-200 shadow-md bg-white flex flex-col h-[calc(100vh-var(--app-sticky-offset)-2rem)]">
            <div className="h-1 w-full bg-gradient-to-r from-primary/95 via-primary/70 to-primary/60" />
            
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Company Profile</h2>
                </div>
              </div>
            </div>
            
            <CardContent className="flex-1 overflow-y-auto p-6">
            {loadError && (
              <div role="alert" className="mb-4 text-red-600">
                <div className="font-semibold mb-1">Error loading company information</div>
                <div className="text-sm">{loadError}</div>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-500 border-b pb-1">Company Information</h3>
              {/* Row 1: Company Name and Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companyInfo.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    placeholder="Enter company name"
                    maxLength={255}
                    required
                    className={`mt-1 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={companyInfo.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Enter company address"
                    required
                    className={`mt-1 ${errors.address ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
              </div>

              {/* Row 2: CIN Number and GST Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="cinNumber">CIN Number *</Label>
                  <Input
                    id="cinNumber"
                    value={companyInfo.cinNumber || ""}
                    onChange={(e) => handleInputChange("cinNumber", e.target.value)}
                    onBlur={() => handleFieldBlur('cinNumber')}
                    placeholder="Enter CIN number"
                    required
                    className={`mt-1 ${errors.cinNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.cinNumber && <p className="text-red-500 text-sm mt-1">{errors.cinNumber}</p>}
                </div>
                <div>
                  <Label htmlFor="gstNumber">GST Number *</Label>
                  <Input
                    id="gstNumber"
                    value={companyInfo.gstNumber || ""}
                    onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                    onBlur={() => handleFieldBlur('gstNumber')}
                    placeholder="Enter GST number"
                    required
                    className={`mt-1 ${errors.gstNumber ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.gstNumber && <p className="text-red-500 text-sm mt-1">{errors.gstNumber}</p>}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-500 border-b pb-1 mt-5">Beneficiary Bank Information</h3>
              {/* Row 3: Bank Name and Bank Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={companyInfo.bankName || ""}
                    onChange={(e) => handleInputChange("bankName", e.target.value)}
                    onBlur={() => handleFieldBlur('bankName')}
                    placeholder="Enter bank name"
                    required
                    className={`mt-1 ${errors.bankName ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>}
                </div>
                <div>
                  <Label htmlFor="bankAddress">Bank Address *</Label>
                  <Input
                    id="bankAddress"
                    value={companyInfo.bankAddress || ""}
                    onChange={(e) => handleInputChange("bankAddress", e.target.value)}
                    onBlur={() => handleFieldBlur('bankAddress')}
                    placeholder="Enter bank address"
                    required
                    className={`mt-1 ${errors.bankAddress ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.bankAddress && <p className="text-red-500 text-sm mt-1">{errors.bankAddress}</p>}
                </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="swiftCode">SWIFT Code *</Label>
                  <Input
                    id="swiftCode"
                    value={companyInfo.swiftCode || ""}
                    onChange={(e) => handleInputChange("swiftCode", e.target.value)}
                    onBlur={() => handleFieldBlur('swiftCode')}
                    placeholder="Enter SWIFT/BIC code"
                    required
                    className={`mt-1 ${errors.swiftCode ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.swiftCode && <p className="text-red-500 text-sm mt-1">{errors.swiftCode}</p>}
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code *</Label>
                  <Input
                    id="ifscCode"
                    value={companyInfo.ifscCode || ""}
                    onChange={(e) => handleInputChange("ifscCode", e.target.value)}
                    onBlur={() => handleFieldBlur('ifscCode')}
                    placeholder="Enter IFSC code"
                    required
                    className={`mt-1 ${errors.ifscCode ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.ifscCode && <p className="text-red-500 text-sm mt-1">{errors.ifscCode}</p>}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-500 border-b pb-1 mt-5">Remitting Bank Information</h3>
              {/* Row 1: Remitting Bank Name and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                <div>
                  <Label htmlFor="remittingBankName">Name of Bank *</Label>
                  <Input
                    id="remittingBankName"
                    value={companyInfo.remittingBankName || ""}
                    onChange={(e) => handleInputChange("remittingBankName", e.target.value)}
                    onBlur={() => handleFieldBlur('remittingBankName')}
                    placeholder="e.g., J P MORGAN CHASE BANK, NEW YORK"
                    required
                    className={`mt-1 ${errors.remittingBankName ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.remittingBankName && <p className="text-red-500 text-sm mt-1">{errors.remittingBankName}</p>}
                </div>
                <div>
                  <Label htmlFor="remittingAccountNo">A/C No *</Label>
                  <Input
                    id="remittingAccountNo"
                    value={companyInfo.remittingAccountNo || ""}
                    onChange={(e) => handleInputChange("remittingAccountNo", e.target.value)}
                    onBlur={() => handleFieldBlur('remittingAccountNo')}
                    placeholder="e.g., 00671 1 427374"
                    required
                    className={`mt-1 ${errors.remittingAccountNo ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.remittingAccountNo && <p className="text-red-500 text-sm mt-1">{errors.remittingAccountNo}</p>}
                </div>
                <div>
                  <Label htmlFor="remittingSwiftCode">Swift Code *</Label>
                  <Input
                    id="remittingSwiftCode"
                    value={companyInfo.remittingSwiftCode || ""}
                    onChange={(e) => handleInputChange("remittingSwiftCode", e.target.value)}
                    onBlur={() => handleFieldBlur('remittingSwiftCode')}
                    placeholder="e.g., FGDTD533XXX"
                    required
                    className={`mt-1 ${errors.remittingSwiftCode ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.remittingSwiftCode && <p className="text-red-500 text-sm mt-1">{errors.remittingSwiftCode}</p>}
                </div>
                <div>
                  <Label htmlFor="remittingIbanNo">IBAN No *</Label>
                  <Input
                    id="remittingIbanNo"
                    value={companyInfo.remittingIbanNo || ""}
                    onChange={(e) => handleInputChange("remittingIbanNo", e.target.value)}
                    onBlur={() => handleFieldBlur('remittingIbanNo')}
                    placeholder="e.g., GB33BUKB20201555555555"
                    required
                    className={`mt-1 ${errors.remittingIbanNo ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {errors.remittingIbanNo && <p className="text-red-500 text-sm mt-1">{errors.remittingIbanNo}</p>}
                </div>
              </div>

              {/* Signing Section */}
              <h3 className="text-lg font-semibold text-gray-500 border-b pb-1 mt-6">Authorized Signatories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Upload Signature</Label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"
                    onChange={(e) => handleImageChange(e, 'signatureImage')}
                  />
                  {companyInfo.signatureImage ? (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={companyInfo.signatureImage as string}
                        alt="Signature preview"
                        className="h-16 w-auto border rounded"
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => clearImage('signatureImage')}>Clear</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">PNG/JPG, recommended transparent background.</p>
                  )}
                </div>
                <div>
                  <Label>Upload Company Stamp</Label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 hover:file:bg-gray-200"
                    onChange={(e) => handleImageChange(e, 'companyStampImage')}
                  />
                  {companyInfo.companyStampImage ? (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={companyInfo.companyStampImage as string}
                        alt="Company stamp preview"
                        className="h-16 w-16 object-contain border rounded"
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => clearImage('companyStampImage')}>Clear</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">PNG/JPG, square preferred.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label htmlFor="signatoryName">Signatory Name</Label>
                  <Input
                    id="signatoryName"
                    value={companyInfo.signatoryName || ''}
                    onChange={(e) => handleInputChange('signatoryName', e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signatoryDesignation">Designation</Label>
                  <Input
                    id="signatoryDesignation"
                    value={companyInfo.signatoryDesignation || ''}
                    onChange={(e) => handleInputChange('signatoryDesignation', e.target.value)}
                    placeholder="e.g., Director"
                    className="mt-1"
                  />
                </div>
              </div>

            </CardContent>
            
            <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex justify-end space-x-3">
                <Button
                  type="submit"
                  className="min-w-[200px]"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default CompanyInfo;
