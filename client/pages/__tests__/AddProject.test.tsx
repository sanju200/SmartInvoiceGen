/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import React from 'react';

// Mocks
const mockNavigate = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useProjects', () => ({
  useCreateProject: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import the component AFTER mocks so they take effect
import AddProject from '../AddProject';

let queryClient: QueryClient;

describe('AddProject Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure the component sees an auth token so it doesn't redirect
    window.localStorage.setItem('auth_token', 'test-token');
    queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AddProject />
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>
    );
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('should render all form fields', () => {
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
  });

  it('should show validation error for required fields on submit', async () => {
    const form = document.getElementById('project-form')!;
    fireEvent.submit(form);
    // Assert on specific messages the component renders; allow time for state updates
    await waitFor(() => {
      expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/customer name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/customer address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/contact person is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show validation error for invalid email format', async () => {
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid-email');
    // Submit to surface errors (component shows errors after submitAttempted)
    const form = document.getElementById('project-form')!;
    fireEvent.submit(form);
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it('should not submit with invalid data', async () => {
    await userEvent.type(screen.getByLabelText(/project name/i), 'a');
    const form = document.getElementById('project-form')!;
    fireEvent.submit(form);
    // Expect at least one inline validation error to appear
    const inlineErrors = await screen.findAllByText(/required|must be|cannot|enter|select/i);
    expect(inlineErrors.length).toBeGreaterThan(0);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('should call createProject mutation with correct data on valid submission', async () => {
    mockMutateAsync.mockResolvedValueOnce({});

    // Fill out the form with valid data
    await userEvent.type(screen.getByLabelText(/project name/i), 'New Awesome Project');
    await userEvent.type(screen.getByPlaceholderText(/e\.g\., WEST/i), 'N-A-P');
    await userEvent.type(screen.getByLabelText(/^customer name/i), 'Test Customer Inc.');
    await userEvent.type(screen.getByLabelText(/customer address/i), '123 Test Lane, Test City');
    await userEvent.type(screen.getByLabelText(/contact person/i), 'John Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'john.doe@testcustomer.com');
    await userEvent.type(screen.getByLabelText(/invoice purpose/i), 'Monthly retainer services');
    await userEvent.type(screen.getByLabelText(/sow reference/i), 'SOW-2024-001');

    const submitButton = screen.getByRole('button', { name: /create project/i });

    // Check the button is not disabled before submitting
    expect(submitButton).not.toBeDisabled();

    await userEvent.click(submitButton);

    // Ensure that the mutation was called with the correct data
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Awesome Project',
        customerName: 'Test Customer Inc.',
        email: 'john.doe@testcustomer.com',
        paymentDueDays: 30, // Default value after transform
      }));
    });

    // Ensure navigation happens after successful submission
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should allow selecting net terms and pass them to mutation', async () => {
    mockMutateAsync.mockResolvedValueOnce({});

    // Select Net Terms (open Select with testid trigger and choose 15 days)
    const netTermsTrigger = screen.getByTestId('payment-due-days-trigger');
    await userEvent.click(netTermsTrigger);
    const listbox = await screen.findByRole('listbox');
    const option15 = within(listbox).getByText(/15 days/i);
    await userEvent.click(option15);

    // Fill remaining required fields
    await userEvent.type(screen.getByLabelText(/project name/i), 'Select Test Project');
    await userEvent.type(screen.getByPlaceholderText(/e\.g\., WEST/i), 'SEL-TEST');
    await userEvent.type(screen.getByLabelText(/^customer name/i), 'Customer Inc.');
    await userEvent.type(screen.getByLabelText(/customer address/i), '42 Select Street');
    await userEvent.type(screen.getByLabelText(/contact person/i), 'Casey Select');
    await userEvent.type(screen.getByLabelText(/email/i), 'casey@customer.com');
    await userEvent.type(screen.getByLabelText(/invoice purpose/i), 'Testing select components');
    await userEvent.type(screen.getByLabelText(/sow reference/i), 'SOW-SEL-1');

    // Submit via form submit to ensure onSubmit handler runs in JSDOM
    const form = document.getElementById('project-form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Verify paymentDueDays transformed to number 15
    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg.paymentDueDays).toBe(15);
  });

  it('should transform default net terms (30) to number when submitting without change', async () => {
    mockMutateAsync.mockResolvedValueOnce({});

    // Fill out the form minimally with default currency and net terms (30)
    await userEvent.type(screen.getByLabelText(/project name/i), 'Default Net Term Project');
    await userEvent.type(screen.getByPlaceholderText(/e\.g\., WEST/i), 'DEF-NET');
    await userEvent.type(screen.getByLabelText(/^customer name/i), 'Default Customer');
    await userEvent.type(screen.getByLabelText(/customer address/i), '123 Default Ave');
    await userEvent.type(screen.getByLabelText(/contact person/i), 'Dora Default');
    await userEvent.type(screen.getByLabelText(/email/i), 'dora@default.com');
    await userEvent.type(screen.getByLabelText(/invoice purpose/i), 'Default purpose');
    await userEvent.type(screen.getByLabelText(/sow reference/i), 'SOW-DEF-1');

    // Submit
    const form = document.getElementById('project-form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      const callArg = mockMutateAsync.mock.calls[0][0];
      expect(callArg.paymentDueDays).toBe(30);
    });
  });
});
