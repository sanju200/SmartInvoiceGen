import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form';
import { Input } from '../input';
import { Button } from '../button';
import React from 'react';

// 1. Create a form schema using Zod
const formSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
});

// 2. A test component that uses the Form components
const TestFormComponent = ({ onSubmit }: { onSubmit: (data: z.infer<typeof formSchema>) => void }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

describe('Form Components', () => {
  it('should render the form and its fields correctly', () => {
    render(<TestFormComponent onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should display a validation error for invalid input', async () => {
    render(<TestFormComponent onSubmit={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await userEvent.click(submitButton);

    expect(await screen.findByText(/username must be at least 2 characters/i)).toBeInTheDocument();
  });

  it('should not display a validation error for valid input', async () => {
    render(<TestFormComponent onSubmit={vi.fn()} />);
    const usernameInput = screen.getByLabelText(/username/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await userEvent.type(usernameInput, 'ValidUser');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/username must be at least 2 characters/i)).not.toBeInTheDocument();
    });
  });

  it('should call onSubmit with form data on valid submission', async () => {
    const mockSubmit = vi.fn();
    render(<TestFormComponent onSubmit={mockSubmit} />);
    const usernameInput = screen.getByLabelText(/username/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });

    await userEvent.type(usernameInput, 'TestUser');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
      expect(mockSubmit.mock.calls[0][0]).toEqual({ username: 'TestUser' });
    });
  });

  it('should set aria-invalid and render FormMessage when error is present', async () => {
    render(<TestFormComponent onSubmit={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    const input = screen.getByLabelText(/username/i);
    // FormControl should set aria-invalid when there is an error
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // FormMessage should be visible
    expect(await screen.findByText(/username must be at least 2 characters/i)).toBeInTheDocument();
  });

  it('should remove error message and aria-invalid after entering valid input', async () => {
    render(<TestFormComponent onSubmit={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    // Trigger error first
    await userEvent.click(submitButton);
    const input = screen.getByLabelText(/username/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByText(/username must be at least 2 characters/i)).toBeInTheDocument();

    // Fix input
    await userEvent.type(input, 'OK');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/username must be at least 2 characters/i)).not.toBeInTheDocument();
      // aria-invalid should be falsey or absent after fix
      expect(input.getAttribute('aria-invalid')).not.toBe('true');
    });
  });
});
