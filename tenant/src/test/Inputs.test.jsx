import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextInput, PasswordInput, CheckboxInput, SwitchInput, TextareaInput, SearchInput } from '../Components/Input/Inputs';

describe('TextInput', () => {
  it('renders with label', () => {
    render(<TextInput label="Email" onChange={vi.fn()} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<TextInput onChange={vi.fn()} />);
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('displays placeholder', () => {
    render(<TextInput placeholder="Enter email" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();
    render(<TextInput onChange={handleChange} placeholder="Type" />);
    fireEvent.change(screen.getByPlaceholderText('Type'), { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error message', () => {
    render(<TextInput onChange={vi.fn()} error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('does not display error when none provided', () => {
    const { container } = render(<TextInput onChange={vi.fn()} />);
    expect(container.querySelector('.auth-error-message')).not.toBeInTheDocument();
  });

  it('renders with controlled value', () => {
    render(<TextInput value="test@email.com" onChange={vi.fn()} placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveValue('test@email.com');
  });
});

describe('PasswordInput', () => {
  it('renders as password type by default', () => {
    render(<PasswordInput label="Password" onChange={vi.fn()} placeholder="Enter password" />);
    expect(screen.getByPlaceholderText('Enter password')).toHaveAttribute('type', 'password');
  });

  it('toggles visibility when eye icon is clicked', () => {
    render(<PasswordInput onChange={vi.fn()} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');

    // Click the toggle icon (svg)
    const toggle = document.querySelector('.password-toggle-icon');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');

    // Click again to hide
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('displays error message', () => {
    render(<PasswordInput onChange={vi.fn()} error="Too short" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });
});

describe('CheckboxInput', () => {
  it('renders with label', () => {
    render(<CheckboxInput label="Agree" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('Agree')).toBeInTheDocument();
  });

  it('renders checked state', () => {
    render(<CheckboxInput label="Terms" checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('renders unchecked state', () => {
    render(<CheckboxInput label="Terms" checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<CheckboxInput label="Accept" checked={false} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error', () => {
    render(<CheckboxInput checked={false} onChange={vi.fn()} error="Must accept" />);
    expect(screen.getByText('Must accept')).toBeInTheDocument();
  });
});

describe('SwitchInput', () => {
  it('renders with label', () => {
    render(<SwitchInput label="Active" checked={true} onChange={vi.fn()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('reflects checked state', () => {
    const { container } = render(<SwitchInput label="2FA" checked={true} onChange={vi.fn()} />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(true);
  });

  it('calls onChange when toggled', () => {
    const handleChange = vi.fn();
    const { container } = render(<SwitchInput label="Toggle" checked={false} onChange={handleChange} />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('TextareaInput', () => {
  it('renders with label', () => {
    render(<TextareaInput label="Description" onChange={vi.fn()} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders textarea element', () => {
    const { container } = render(<TextareaInput onChange={vi.fn()} placeholder="Write here" />);
    expect(container.querySelector('textarea')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();
    render(<TextareaInput onChange={handleChange} placeholder="Notes" />);
    fireEvent.change(screen.getByPlaceholderText('Notes'), { target: { value: 'Some note' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error', () => {
    render(<TextareaInput onChange={vi.fn()} error="Too long" />);
    expect(screen.getByText('Too long')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('renders search input', () => {
    render(<SearchInput onChange={vi.fn()} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('has type search', () => {
    render(<SearchInput onChange={vi.fn()} placeholder="Find" />);
    expect(screen.getByPlaceholderText('Find')).toHaveAttribute('type', 'search');
  });

  it('calls onChange', () => {
    const handleChange = vi.fn();
    render(<SearchInput onChange={handleChange} placeholder="Search" />);
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders search icon', () => {
    const { container } = render(<SearchInput onChange={vi.fn()} />);
    expect(container.querySelector('.search-icon')).toBeInTheDocument();
  });
});
