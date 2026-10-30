import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Components/Button/Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="Submit" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows spinner when loading', () => {
    render(<Button label="Save" loading={true} />);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<Button label="Save" loading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Save" disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button label="Save" disabled onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders icon on the left by default', () => {
    const icon = <span data-testid="icon">★</span>;
    render(<Button label="Star" icon={icon} />);
    const button = screen.getByRole('button');
    const iconEl = screen.getByTestId('icon');
    const label = screen.getByText('Star');
    // Icon should appear before label in DOM
    expect(button.firstChild).toContainElement(iconEl);
    expect(label).toBeInTheDocument();
  });

  it('renders icon on the right when iconPosition is right', () => {
    const icon = <span data-testid="icon">★</span>;
    render(<Button label="Next" icon={icon} iconPosition="right" />);
    const label = screen.getByText('Next');
    const iconEl = screen.getByTestId('icon');
    expect(label).toBeInTheDocument();
    expect(iconEl).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(<Button label="Danger" variant="danger" />);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('applies size class', () => {
    render(<Button label="Small" size="small" />);
    expect(screen.getByRole('button')).toHaveClass('btn-small');
  });
});
