import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInput, SelectInput, MultiSelectInput, CheckboxInput, SwitchInput } from '../Components/Input/Inputs';

describe('TextInput', () => {
  it('renders with label and placeholder', () => {
    render(<TextInput label="Name" placeholder="Enter name" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<TextInput label="Email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<TextInput label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe('SelectInput', () => {
  const options = [
    { value: '', label: 'Select...' },
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('renders options', () => {
    render(<SelectInput label="Choose" options={options} />);
    expect(screen.getByText('Choose')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<SelectInput label="Choose" options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe('MultiSelectInput', () => {
  const options = [
    { value: '1', label: 'One' },
    { value: '2', label: 'Two' },
    { value: '3', label: 'Three' },
  ];

  it('renders placeholder when no values selected', () => {
    render(<MultiSelectInput label="Items" options={options} value={[]} onChange={() => {}} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('shows selected tags', () => {
    render(<MultiSelectInput label="Items" options={options} value={['1', '2']} onChange={() => {}} />);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<MultiSelectInput label="Items" options={options} value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('Select...'));
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });

  it('toggles selection', () => {
    const onChange = vi.fn();
    render(<MultiSelectInput label="Items" options={options} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Select...'));
    fireEvent.click(screen.getByText('One'));
    expect(onChange).toHaveBeenCalledWith(['1']);
  });

  it('removes tag on x click', () => {
    const onChange = vi.fn();
    render(<MultiSelectInput label="Items" options={options} value={['1']} onChange={onChange} />);
    const removeBtn = screen.getByText('×');
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('CheckboxInput', () => {
  it('renders with label', () => {
    render(<CheckboxInput label="Accept" checked={false} onChange={() => {}} />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<CheckboxInput label="Accept" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
  });
});

describe('SwitchInput', () => {
  it('renders', () => {
    const { container } = render(<SwitchInput checked={false} onChange={() => {}} />);
    expect(container.querySelector('.input-switch-group')).toBeInTheDocument();
  });

  it('handles toggle', () => {
    const onChange = vi.fn();
    render(<SwitchInput checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
  });
});
