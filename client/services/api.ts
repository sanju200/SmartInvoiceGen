import { User } from '@prisma/client';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  CurrencyAccount,
  CreateCurrencyAccountRequest,
  UpdateCurrencyAccountRequest,
  Company,
} from '@shared/api';

// Single-token strategy: no refresh token handling needed

const API_BASE = '/api';

class APIService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token = localStorage.getItem('access_token');

    // If no token, return empty headers
    if (!token) {
      return {};
    }

    // Ensure token doesn't have quotes and is trimmed
    token = token.replace(/^"|"$/g, '').trim();

    return { 'Authorization': `Bearer ${token}` };
  }

  private handleUnauthenticated() {
    // Clear tokens from storage
    localStorage.removeItem('access_token');
    
    
    // Only redirect if we're in the browser and not already on the login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // Store the current URL to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = '/login';
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {

    try {
      const headers = await this.getAuthHeaders();

      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
          ...options.headers,
        },
        credentials: 'include' as RequestCredentials,
      };

      const response = await fetch(`${API_BASE}${endpoint}`, config);

      // If unauthorized, handle and surface error immediately
      if (response.status === 401) {
        this.handleUnauthenticated();
      }

      // Handle the response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: response.statusText || 'Unknown error',
          status: response.status,
        }));

        // 401 -> force logout
        if (response.status === 401) {
          this.handleUnauthenticated();
          throw new Error('Session expired. Please log in again.');
        }

        // For other errors, include the status code in the error
        const errorMessage = errorData?.message || errorData?.error || response.statusText;
        const error = new Error(errorMessage) as Error & { status?: number; data?: unknown };
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Handle empty responses (like 204 No Content)
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        return null as unknown as T;
      }

      return response.json();
    } catch (error) {
      // If it's a network error or other fetch error, don't retry
      if (error instanceof Error && error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Currency Accounts (admin-only)
  async getCurrencyAccounts(): Promise<CurrencyAccount[]> {
    return this.request<CurrencyAccount[]>('/currency-accounts');
  }

  async createCurrencyAccount(data: CreateCurrencyAccountRequest): Promise<CurrencyAccount> {
    return this.request<CurrencyAccount>('/currency-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCurrencyAccount(id: string, data: UpdateCurrencyAccountRequest): Promise<CurrencyAccount> {
    return this.request<CurrencyAccount>(`/currency-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCurrencyAccount(id: string): Promise<void> {
    return this.request<void>(`/currency-accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Company
  async getCompany(userId?: string): Promise<Company | null> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    const qs = params.toString();
    return this.request<Company | null>(`/company${qs ? `?${qs}` : ''}`);
  }

  async getCurrencyAccountByCurrency(currency: string, opts?: { decrypted?: boolean }): Promise<{ id: string; currency: string; last4: string; accountNumber?: string; userId: string; createdAt: string; updatedAt: string; } | null> {
    const params = new URLSearchParams();
    if (opts?.decrypted) params.set('decrypted', '1');
    const qs = params.toString();
    const path = `/currency-accounts/by-currency/${encodeURIComponent(currency.toUpperCase())}${qs ? `?${qs}` : ''}`;
    return this.request(path);
  }


  // Auth
  async updateProfile(data: { name?: string; email?: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updatePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.newPassword // Match the server's expected format
      }),
    });
  }

  // Health check
  async ping(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/ping');
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new APIService();
