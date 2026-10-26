/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from '../../Signup';
import { AuthContext } from '@/contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock the useAuth hook
const mockSignup = vi.fn();
const mockAuthContext = {
  user: null,
  token: null,
  login: vi.fn(),
  signup: mockSignup,
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
};

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ token: 'valid-token' })],
  };
});

// Mock global fetch
global.fetch = vi.fn();

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful fetch mock
    (fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ email: 'test@example.com', isAdmin: false }),
    });
  });

  const renderComponent = () => {
    render(
      <MemoryRouter initialEntries={['/signup?token=valid-token']}>
        <AuthContext.Provider value={mockAuthContext}>
          <Signup />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('should require name before submitting', async () => {
    renderComponent();
    // Ensure invite validation completed and email is prefilled before submitting
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com'));
    await userEvent.type(screen.getByLabelText('Password *'), 'ValidPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    // Wait for the alert to appear in the DOM before checking its content
    const alerts = await screen.findAllByRole('alert');
    const hasNameError = alerts.some(a => (a.textContent || '').toLowerCase().includes('name is required'));
    expect(hasNameError).toBe(true);
  });

  it('should show error when invite token is missing', async () => {
    // Reset modules and remock react-router-dom before importing Signup
    vi.resetModules();
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams({})],
      };
    });
    const { default: SignupDefault } = await import('../../Signup');
    const { AuthContext: FreshAuthContext } = await import('@/contexts/AuthContext');
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <FreshAuthContext.Provider value={mockAuthContext as any}>
          <SignupDefault />
        </FreshAuthContext.Provider>
      </MemoryRouter>
    );
    const errs = await screen.findAllByText((c, n) => (n?.textContent || '').toLowerCase().includes('invite token is missing'));
    expect(errs.length).toBeGreaterThan(0);
    vi.resetModules();
  });

  it('should toggle password visibility for both fields', async () => {
    renderComponent();
    const passwordInput = screen.getByLabelText('Password *') as HTMLInputElement;
    const confirmInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement;
    // Toggle main password visibility
    const pwdToggle = passwordInput.parentElement?.querySelector('button') as HTMLButtonElement;
    expect(passwordInput.type).toBe('password');
    await userEvent.click(pwdToggle);
    expect(passwordInput.type).toBe('text');
    await userEvent.click(pwdToggle);
    expect(passwordInput.type).toBe('password');
    // Toggle confirm visibility
    const confirmToggle = confirmInput.parentElement?.querySelector('button') as HTMLButtonElement;
    expect(confirmInput.type).toBe('password');
    await userEvent.click(confirmToggle);
    expect(confirmInput.type).toBe('text');
  });

  it('should not submit when password is weak (keeps button enabled after failure)', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com'));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Weak User');
    await userEvent.type(screen.getByLabelText('Password *'), 'weak');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'weak');
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await userEvent.click(submitBtn);
    const errs = await screen.findAllByText(/password must be at least 8 characters long/i);
    expect(errs.length).toBeGreaterThan(0);
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('should show error when signup throws', async () => {
    mockSignup.mockRejectedValueOnce(new Error('Signup failed'));
    renderComponent();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com'));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Test User');
    await userEvent.type(screen.getByLabelText('Password *'), 'ValidPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/signup failed/i)).toBeInTheDocument();
  });

  it('should validate invite token and pre-fill email', async () => {
    renderComponent();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/invitations/valid-token');
      expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    });
  });

  it('should display an error for an invalid invite token', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid Token' }),
    });
    renderComponent();
    expect(await screen.findByText('Invalid Token')).toBeInTheDocument();
  });

  it('should show password validation errors', async () => {
    renderComponent();
    const passwordInput = screen.getByLabelText('Password *');
    
    await userEvent.type(passwordInput, 'weak');
    
    // Wait explicitly for validation errors to appear
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
      expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument();
      expect(screen.getByText(/password must contain at least one special character/i)).toBeInTheDocument();
    });
  });

  it('should show an error if passwords do not match', async () => {
    renderComponent();
    await userEvent.type(screen.getByLabelText('Password *'), 'Password123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Password123');
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should call signup and navigate on successful submission', async () => {
    mockSignup.mockResolvedValueOnce({ success: true });
    renderComponent();

    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com'));

    await userEvent.type(screen.getByLabelText(/full name/i), 'Test User');
    await userEvent.type(screen.getByLabelText('Password *'), 'ValidPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');
    
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('Test User', 'valid-token', 'ValidPassword123!', 'ValidPassword123!');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should disable submit button while signing up and re-enable after', async () => {
    renderComponent();
    // Wait for email prefill
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com'));

    // Fill required fields
    await userEvent.type(screen.getByLabelText(/full name/i), 'Loading User');
    await userEvent.type(screen.getByLabelText('Password *'), 'ValidPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');

    // Make signup return a pending promise so we can assert the disabled state
    let resolveSignup: (v?: any) => void;
    const pending = new Promise(res => { resolveSignup = res; });
    mockSignup.mockReturnValueOnce(pending as any);

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    // Should be disabled while promise is pending
    expect(submitBtn).toBeDisabled();

    // Resolve the signup
    resolveSignup!({ success: true });

    // Wait for re-enable
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('should display Admin role when invite indicates isAdmin true', async () => {
    // Make fetch return isAdmin true and a specific email
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ email: 'admin@example.com', isAdmin: true }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveValue('admin@example.com');
    });

    // The Role (from invite) input should display 'Admin'
    const roleField = screen.getByDisplayValue('Admin');
    expect(roleField).toBeInTheDocument();
  });
});
