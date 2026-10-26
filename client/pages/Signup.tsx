import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, UserPlus, Mail, Lock, User } from 'lucide-react';
// import { CompanyLogoSmall } from '@/components/ui/CompanyLogo';
import smartInvoGenLogo from '@/assets/images/smartInvoGenLogo.png';
import { ROUTES } from '@/constants';
import { MESSAGES } from '@/constants/messages';
import BuiltWithPurpose from '@/components/common/SideMenuFooter';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [inviteToken, setInviteToken] = useState<string>('');
  const [isAdminFromInvite, setIsAdminFromInvite] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  // Password validation helper functions (same as AppLayout)
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push(MESSAGES.passwordMinLength);
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push(MESSAGES.passwordMustContainAtLeastOneUppercaseLetter);
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push(MESSAGES.passwordMustContainAtLeastOneNumber);
    }
    
    // eslint-disable-next-line no-useless-escape
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push(MESSAGES.passwordMustContainAtLeastOneSpecialCharacter);
    }
    
    return errors;
  };

  const validatePasswordChange = (): string[] => {
    const errors: string[] = [];
    
    // Validate password strength
    const strengthErrors = validatePassword(formData.password);
    errors.push(...strengthErrors);
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword && formData.confirmPassword.length > 0) {
      errors.push(MESSAGES.passwordsDoNotMatch);
    }
    
    return errors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validate invite token and fetch email for prefill
  useEffect(() => {
    setInviteToken(token);
    if (!token) {
      setError(MESSAGES.inviteTokenMissing);
      setIsValidating(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/auth/invitations/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || MESSAGES.invalidInviteLink);
        } else {
          setFormData(prev => ({ ...prev, email: data.email }));
          setIsAdminFromInvite(!!data.isAdmin);
        }
      } catch {
        setError(MESSAGES.failedToValidateInviteToken);
      } finally {
        setIsValidating(false);
      }
    })();
  }, [token]);

  // Update password errors when passwords change
  useEffect(() => {
    const newErrors = validatePasswordChange();
    // Use functional update to compare with the latest state and avoid stale closure
    setPasswordErrors((current) => {
      return JSON.stringify(newErrors) !== JSON.stringify(current)
        ? newErrors
        : current;
    });
  }, [formData.password, formData.confirmPassword]); // Only trigger on these specific dependencies
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError(MESSAGES.name);
      return;
    }
    if (!inviteToken) {
      setError(MESSAGES.inviteTokenRequired);
      return;
    }
    
    // Use comprehensive password validation
    const passwordValidationErrors = validatePasswordChange();
    if (passwordValidationErrors.length > 0) {
      setError(passwordValidationErrors[0]); // Show first error
      return;
    }

    setIsLoading(true);

    try {
      await signup(formData.name, inviteToken, formData.password, formData.confirmPassword);
      navigate(ROUTES.index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 sm:p-6 lg:p-8 transition-all duration-500 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-2xl space-y-4 mt-[-2.25rem]">
        {/* App Brand */}
        {/* <div className="text-center transform transition-all duration-500 hover:scale-105">
          <div className="mx-auto w-16 h-16 mb-2 flex items-center justify-center">
            <CompanyLogoSmall size="small" className="w-10 h-10"/>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1">
            Smart<span className="text-primary">InvoGen</span>
          </h1>
        </div> */}

         <div className='d-flex justify-content-center align-items-middle'>
              <img
              src={smartInvoGenLogo}
              alt="SmartInvoGen"
              className="w-[240px] h-auto object-contain mx-auto"
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
            />
            </div>

        <Card className="border-0 shadow-xl overflow-hidden bg-white/95 backdrop-blur-sm transform transition-all duration-300 hover:shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>
          
          <CardHeader className="pb-4 pt-6 px-6">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center">
              <span className="bg-primary/10 p-2 rounded-lg mr-3">
                <UserPlus className="w-5 h-5 text-primary" />
              </span>
              Create your account
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              You must use a valid invite link to register
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="px-6 pb-4 space-y-3">
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isValidating && (
                <div className="text-sm text-gray-500">Validating invite...</div>
              )}

              <div className="space-y-1">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    className="pl-9 pr-9 h-10 text-sm border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email (from invite)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input id="email" type="email" value={formData.email} disabled className="bg-gray-50 pl-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Role (from invite)</Label>
                  <Input value={isAdminFromInvite ? 'Admin' : 'User'} disabled className="bg-gray-50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your password (min 8 characters)"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className={`pl-9 pr-9 h-10 text-sm border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 ${passwordErrors.length > 0 ? 'border-red-500' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {/* Password validation errors */}
                  {passwordErrors.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-red-500 text-xs">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      required
                      className="pl-9 pr-10 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-0">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link
                  to={ROUTES.login}
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign in here
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

       <div className="mt-auto py-3 px-4 absolute bottom-0 text-nowrap">
        <BuiltWithPurpose />
      </div>
    </div>
  );
}
