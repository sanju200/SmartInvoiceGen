import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../input';
import { Label } from '../label';
import React from 'react';

function Field() {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input id="email" placeholder="you@example.com" />
    </div>
  );
}

describe('UI/Input', () => {
  it('renders an input with associated label', () => {
    render(<Field />);
    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe('you@example.com');
  });

  it('supports disabled state and type attribute', () => {
    render(<Input aria-label="amount" type="number" disabled />);
    const input = screen.getByLabelText(/amount/i) as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input.type).toBe('number');
  });

  it('marks invalid state via aria-invalid when provided', () => {
    render(<Input aria-label="name" aria-invalid="true" />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
