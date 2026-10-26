/* eslint-disable no-useless-escape */
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutGrid, Building2, UserPlus, Wallet, LogOut, Eye, EyeOff, Check, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import BuiltWithPurpose from '@/components/common/SideMenuFooter';
import smartInvoGenLogo from '../../assets/images/smartInvoGenLogo.png';
import { CompanyLogoSmall } from '../ui/CompanyLogo';



interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout, updateUser } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const { toast } = useToast();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string>('');

  const isActive = (href: string) => (path === href || (href !== "/" && path.startsWith(href)));

  const initials = (user?.name || user?.email || "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  // Password validation helper functions
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }
    
    return errors;
  };

  // Reset the Edit Profile form when the dialog opens
  const resetProfileForm = React.useCallback(() => {
    setActiveTab('personal');
    setName(user?.name ?? '');
    setProfileError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordErrors([]);
    setIsLoading(false);
  }, [user]);

  const handleProfileOpenChange = (open: boolean) => {
    setIsProfileOpen(open);
    if (open) {
      resetProfileForm();
    }
  };

  const validatePasswordChange = (): string[] => {
    const errors: string[] = [];
    
    // Validate new password strength
    const strengthErrors = validatePassword(newPassword);
    errors.push(...strengthErrors);
    
    // Check if new password matches current password
    if (newPassword === currentPassword && newPassword.length > 0) {
      errors.push("New password must be different from current password");
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword && confirmPassword.length > 0) {
      errors.push("New passwords do not match");
    }
    
    return errors;
  };

  // Update password errors when passwords change
  React.useEffect(() => {
    if (activeTab === 'password' && (newPassword || confirmPassword || currentPassword)) {
      const errors = validatePasswordChange();
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  }, [newPassword, confirmPassword, currentPassword, activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (activeTab === 'personal') {
        // Validate name before submission
        if (!name.trim()) {
          setProfileError('Name is required');
          return;
        }
        const response = await api.updateProfile({ name: name.trim() });
        updateUser(response.user);
        toast({
          title: "Success",
          description: "Your profile has been updated successfully.",
          variant: "success",
        });
      } else if (activeTab === 'password') {
        // Validate password before submission
        const validationErrors = validatePasswordChange();
        if (validationErrors.length > 0) {
          throw new Error(validationErrors[0]);
        }
        
        await api.updatePassword({
          currentPassword,
          newPassword,
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({
          title: "Success",
          description: "Your password has been updated successfully.",
          variant: "success",
        });
      }
      setIsProfileOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className='py-0 group-data-[collapsible=icon]:px-0'>
          {/* <div className="flex items-center gap-1 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <CompanyLogoSmall size="xSmall" />
            <span className="ms-2 text-xl font-bold group-data-[collapsible=icon]:hidden">Smart<span className="text-primary">InvoGen</span></span>
            <br/>
          </div> */}
             <div className='w-[200px] px-2 py-2 h-auto group-data-[collapsible=icon]:hidden'>
              <img
                src={smartInvoGenLogo}
                alt="SmartInvoGen"
                className="w-[200px] h-auto object-contain"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
              />
             </div>
             <div className='w-full h-auto px-2 py-3 group-data-[collapsible=icon]:block hidden'>
               <CompanyLogoSmall size="xSmall" />
             </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Dashboard">
                  <Link to="/">
                    <LayoutGrid />
                    <span>Projects Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/company")} tooltip="Company Info">
                  <Link to="/company">
                    <Building2 />
                    <span>Organization Details</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          {user?.isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/invitations")} tooltip="Admin Invites">
                    <Link to="/admin/invitations">
                      <UserPlus />
                      <span>Invite Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/currency-accounts")} tooltip="Currency Accounts">
                    <Link to="/admin/currency-accounts">
                      <Wallet />
                      <span>Manage Currency Accounts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          )}

          {/* Logout placed under Admin */}
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Logout">
                  <button type="button" onClick={logout} className="flex items-center gap-2 w-full">
                    <LogOut className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          
          {/* Footer with Kizora Logo */}
          <SidebarMenuItem className='fixed bottom-0'>
            <div className="mt-auto py-2 px-4 group-data-[collapsible=icon]:px-2">
              <BuiltWithPurpose className="justify-start bg-white" />
            </div>
          </SidebarMenuItem>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <div className="sticky top-0 z-50 flex items-center gap-2 border-b bg-white shadow-sm px-3 py-2">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-gray-600">{user?.email}</div>
            <Dialog open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
              <DialogTrigger asChild>
                <button aria-label="Open profile" className="rounded-full focus:outline-none border-2 border-primary">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <Tabs 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="personal">Personal Details</TabsTrigger>
                    <TabsTrigger value="password">Change Password</TabsTrigger>
                  </TabsList>
                  
                  <form onSubmit={handleSaveProfile}>
                    <TabsContent value="personal" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                          id="name" 
                          value={name} 
                          required
                          onChange={(e) => {
                            const val = e.target.value;
                            setName(val);
                            if (val.trim()) setProfileError('');
                            else setProfileError('Name is required');
                          }} 
                          placeholder="Your name" 
                        />
                        {profileError && (
                          <div className="text-xs text-red-600" role="alert">{profileError}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          value={user?.email || ''}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input 
                          id="role" 
                          value={user?.isAdmin ? 'Administrator' : 'User'}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isLoading || (activeTab === 'personal' && !name.trim())}>
                          {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="password" className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input 
                            id="currentPassword" 
                            type={showCurrentPassword ? "text" : "password"} 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••" 
                            required
                            disabled={isLoading}
                            className="pr-10"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <div className="relative">
                          <Input 
                            id="newPassword" 
                            type={showNewPassword ? "text" : "password"} 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            placeholder="••••••••" 
                            required
                            disabled={isLoading}
                            className="pr-10"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowNewPassword(!showNewPassword)} 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                          </button>
                        </div>
                        {/* Password Requirements */}
                        {newPassword && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <div className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</div>
                            <div className="space-y-1">
                              <div className={`flex items-center gap-2 text-xs ${newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                                {newPassword.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                At least 8 characters
                              </div>
                              <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                {/[A-Z]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                One uppercase letter
                              </div>
                              <div className={`flex items-center gap-2 text-xs ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                {/[0-9]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                One number
                              </div>
                              <div className={`flex items-center gap-2 text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                One special character
                              </div>
                              {currentPassword && newPassword === currentPassword && (
                                <div className="flex items-center gap-2 text-xs text-red-600">
                                  <X className="h-3 w-3" />
                                  Must be different from current password
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input 
                            id="confirmPassword" 
                            type={showConfirmPassword ? "text" : "password"} 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            placeholder="••••••••" 
                            required
                            disabled={isLoading}
                            className="pr-10"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                          </button>
                        </div>
                        {/* Confirm Password Match Indicator */}
                        {confirmPassword && (
                          <div className={`flex items-center gap-2 text-xs mt-1 ${
                            newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {newPassword === confirmPassword ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={isLoading || passwordErrors.length > 0}
                          className={passwordErrors.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {isLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </TabsContent>
                  </form>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
