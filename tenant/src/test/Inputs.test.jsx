import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextInput, PasswordInput, CheckboxInput, SwitchInput, TextareaInput, SearchInput, RadioInput, TimeInput, CustomDatePickerInput, SelectInput, SearchableSelectInput } from '../Components/Input/Inputs';

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

describe('RadioInput', () => {
  it('renders with label before input (default)', () => {
    render(<RadioInput label="Option A" name="choice" value="a" checked={false} onChange={vi.fn()} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });
  it('renders with label after input', () => {
    render(<RadioInput label="Option B" name="choice" value="b" checked={true} onChange={vi.fn()} inputPosition="after" />);
    expect(screen.getByRole('radio')).toBeChecked();
  });
  it('calls onChange', () => {
    const fn = vi.fn();
    render(<RadioInput label="Opt" name="c" value="a" checked={false} onChange={fn} />);
    fireEvent.click(screen.getByRole('radio'));
    expect(fn).toHaveBeenCalled();
  });
  it('shows error', () => {
    render(<RadioInput label="X" name="c" value="a" checked={false} onChange={vi.fn()} error="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });
  it('renders without label', () => {
    const { container } = render(<RadioInput name="c" value="a" checked={false} onChange={vi.fn()} />);
    expect(container.querySelector('.input-radio-label')).not.toBeInTheDocument();
  });
});

describe('TimeInput', () => {
  it('renders three inputs', () => {
    const { container } = render(<TimeInput onChange={vi.fn()} />);
    expect(container.querySelectorAll('input')).toHaveLength(3);
  });
  it('displays formatted time', () => {
    render(<TimeInput value={{ hours: 9, minutes: 5, seconds: 30 }} onChange={vi.fn()} />);
    expect(screen.getByText('09:05:30')).toBeInTheDocument();
  });
  it('calls onChange when hours change', () => {
    const fn = vi.fn();
    const { container } = render(<TimeInput value={{ hours: 0, minutes: 0, seconds: 0 }} onChange={fn} />);
    fireEvent.change(container.querySelectorAll('input')[0], { target: { value: '14' } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ hours: 14 }));
  });
  it('clamps hours to 23', () => {
    const fn = vi.fn();
    const { container } = render(<TimeInput value={{ hours: 0, minutes: 0, seconds: 0 }} onChange={fn} />);
    fireEvent.change(container.querySelectorAll('input')[0], { target: { value: '99' } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ hours: 23 }));
  });
  it('clamps minutes to 59', () => {
    const fn = vi.fn();
    const { container } = render(<TimeInput value={{ hours: 0, minutes: 0, seconds: 0 }} onChange={fn} />);
    fireEvent.change(container.querySelectorAll('input')[1], { target: { value: '99' } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ minutes: 59 }));
  });
  it('handles NaN as 0', () => {
    const fn = vi.fn();
    const { container } = render(<TimeInput value={{ hours: 0, minutes: 0, seconds: 0 }} onChange={fn} />);
    fireEvent.change(container.querySelectorAll('input')[0], { target: { value: 'abc' } });
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ hours: 0 }));
  });
});

describe('CustomDatePickerInput', () => {
  it('renders with value', () => {
    render(<CustomDatePickerInput value="2026-01-01" placeholder="Pick" />);
    expect(screen.getByDisplayValue('2026-01-01')).toBeInTheDocument();
  });
  it('calls onClick', () => {
    const fn = vi.fn();
    render(<CustomDatePickerInput value="" onClick={fn} placeholder="Pick" />);
    fireEvent.click(screen.getByPlaceholderText('Pick'));
    expect(fn).toHaveBeenCalled();
  });
  it('shows string error', () => {
    render(<CustomDatePickerInput value="" error="Required" placeholder="Pick" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
  it('shows error.message', () => {
    render(<CustomDatePickerInput value="" error={{ message: "Invalid" }} placeholder="Pick" />);
    expect(screen.getByText('Invalid')).toBeInTheDocument();
  });
  it('adds error class', () => {
    const { container } = render(<CustomDatePickerInput value="" error="Bad" placeholder="Pick" />);
    expect(container.querySelector('.custom-datepicker-input-error')).toBeInTheDocument();
  });
});

describe('SelectInput', () => {
  const options = [{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }];
  it('renders with label', () => {
    render(<SelectInput label="Fruit" options={options} onChange={vi.fn()} />);
    expect(screen.getByText('Fruit')).toBeInTheDocument();
  });
  it('renders placeholder', () => {
    render(<SelectInput options={options} onChange={vi.fn()} placeholder="Choose..." />);
    expect(screen.getByText('Choose...')).toBeInTheDocument();
  });
  it('shows error', () => {
    render(<SelectInput options={options} onChange={vi.fn()} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
  it('renders with selected value', () => {
    render(<SelectInput options={options} value="a" onChange={vi.fn()} />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });
});

describe('SearchableSelectInput', () => {
  const options = [{ value: 'us', label: 'United States' }, { value: 'uk', label: 'United Kingdom' }];
  it('renders with label', () => {
    render(<SearchableSelectInput label="Country" options={options} onChange={vi.fn()} />);
    expect(screen.getByText('Country')).toBeInTheDocument();
  });
  it('renders placeholder', () => {
    render(<SearchableSelectInput options={options} onChange={vi.fn()} placeholder="Select..." />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });
  it('shows error', () => {
    render(<SearchableSelectInput options={options} onChange={vi.fn()} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
  it('renders with value', () => {
    render(<SearchableSelectInput options={options} value="us" onChange={vi.fn()} />);
    expect(screen.getByText('United States')).toBeInTheDocument();
  });
  it('renders disabled', () => {
    render(<SearchableSelectInput options={options} onChange={vi.fn()} disabled />);
    expect(screen.getByText('Search options…')).toBeInTheDocument();
  });
});
