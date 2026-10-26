/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../Login';
import { AuthContext } from '@/contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockAuthContext = {
  user: null,
  token: null,
  login: mockLogin,
  signup: vi.fn(),
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
    };
});

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const renderComponent = () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <Login />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('should render the login form correctly', () => {
    renderComponent();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should allow user to enter email and password', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should toggle password visibility', async () => {
    renderComponent();
    const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
    const toggleButton = screen.getByLabelText(/show password/i);

    expect(passwordInput).toHaveAttribute('type', 'password');

    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();

    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should call login function on form submission and navigate on success', async () => {
    // Add a slight delay so loading state can render
    mockLogin.mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 200));
      return undefined;
    });
    renderComponent();

    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    // Wait for loading state via async query and ensure disabled
    const loadingButton = await screen.findByRole('button', { name: /signing in/i });
    expect(loadingButton).toBeDisabled();
    // Wait for navigate after login resolves
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('should display an error message on login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));
    renderComponent();

    await userEvent.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'wrongpassword');
    const callsBefore = mockNavigate.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    // Ensure no new navigation occurred on failure (robust against parallel tests)
    expect(mockNavigate.mock.calls.length).toBe(callsBefore);
  });
});
