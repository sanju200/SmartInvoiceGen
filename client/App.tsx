import React from 'react';
import './global.css';

import { Toaster } from '@/components/ui/toaster';
import { createRoot } from 'react-dom/client';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { TemplateProvider } from './contexts/TemplateContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import Index from './pages/Index';
import Preview from './pages/Preview';
import AddProject from './pages/AddProject';
import CompanyInfo from './pages/CompanyInfo';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminInvites from './pages/AdminInvites';
import AdminCurrencyAccounts from './pages/AdminCurrencyAccounts';
import NotFound from './pages/NotFound';
import AppLayout from '@/components/layout/AppLayout';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProjectProvider>
        <TemplateProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Index />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/preview/:id" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Preview />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/add-project" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AddProject />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/company" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CompanyInfo />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                {/* Admin-only */}
                <Route path="/admin/invitations" element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminInvites />
                    </AppLayout>
                  </AdminRoute>
                } />
                <Route path="/admin/currency-accounts" element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminCurrencyAccounts />
                    </AppLayout>
                  </AdminRoute>
                } />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="/not-found" element={<NotFound />} />
                <Route 
                  path="*" 
                  element={
                    <ProtectedRoute>
                      <Navigate to="/not-found" replace />
                    </ProtectedRoute>
                  } 
                />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TemplateProvider>
      </ProjectProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById('root')!).render(<App />);
