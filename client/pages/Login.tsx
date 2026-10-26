import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import smartInvoGenLogo from '@/assets/images/smartInvoGenLogo.png';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { CompanyLogoSmall } from '@/components/ui/CompanyLogo';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { ROUTES } from '@/constants';
import { MESSAGES } from '@/constants/messages';
import BuiltWithPurpose from "@/components/common/SideMenuFooter";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get safe redirect path
  const getSafeRedirectPath = () => {
    const fromPath = location.state?.from?.pathname;
    
    // If no path or path is the login page, go to index
    if (!fromPath || fromPath === ROUTES.login) {
      return ROUTES.index;
    }
    
    // Allow preview paths
    if (fromPath.startsWith('/preview/')) {
      return fromPath;
    }
    
    // Default to index for any other paths
    return ROUTES.index;
  };
  
  const safeRedirectPath = getSafeRedirectPath();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect to the safe path
      navigate(safeRedirectPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : MESSAGES.projectCreateFailed().description);
    } finally {
      setIsLoading(false);
    }
  };

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8 transition-all duration-500 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-md space-y-4">
        {/* App Brand */}
        <div className="text-center transform transition-all duration-500 hover:scale-105">
          {/* <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            <CompanyLogoSmall size="small" className="w-10 h-10"/>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
          Smart<span className="text-primary">InvoGen</span>
          </h1> */}
            <div className='d-flex justify-content-center align-items-middle'>
              <img
              src={smartInvoGenLogo}
              alt="SmartInvoGen"
              className="w-[240px] h-auto object-contain mx-auto"
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
            />
            </div>
        </div>

        <Card className="border-0 shadow-xl overflow-hidden bg-white/95 backdrop-blur-sm transform transition-all duration-300 hover:shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60"></div>
          
          <CardHeader className="pb-6 pt-8 px-8">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center">
              <span className="bg-primary/10 p-2 rounded-lg mr-3">
                <Mail className="w-5 h-5 text-primary" />
              </span>
              Sign In
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="px-8 pb-6 space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-100 bg-red-50 animate-fade-in">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="pl-10 h-11 text-base border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                  {/* <Link 
                    to={ROUTES.forgotPassword}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link> */}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="pl-10 pr-10 h-11 text-base border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all duration-200"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
        <div className="mt-auto  px-4 left-0 right-0 absolute bottom-0 text-nowrap">
          <BuiltWithPurpose className='py-3 bg-[#f5f5f5]'/>
        </div>
      </div>
    </div>
  );
}
