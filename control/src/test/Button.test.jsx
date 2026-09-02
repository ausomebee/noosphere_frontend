import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Components/Button/Button';
import { FaPlus } from 'react-icons/fa';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Click" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows spinner when loading', () => {
    render(<Button label="Save" loading={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('.button-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Save" disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    const onClick = vi.fn();
    render(<Button label="Save" loading={true} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders icon on the left by default', () => {
    render(<Button label="Add" icon={<FaPlus data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders icon on the right when specified', () => {
    render(<Button label="Next" icon={<FaPlus data-testid="icon" />} iconPosition="right" />);
    const button = screen.getByRole('button');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    // Icon should come after label in DOM
    expect(button.innerHTML.indexOf('Next')).toBeLessThan(button.innerHTML.indexOf('icon'));
  });

  it('applies variant class', () => {
    render(<Button label="Delete" variant="danger" />);
    expect(screen.getByRole('button')).toHaveClass('danger');
  });

  it('applies custom width', () => {
    render(<Button label="Wide" width="300px" />);
    expect(screen.getByRole('button')).toHaveStyle({ width: '300px' });
  });

  it('sets button type', () => {
    render(<Button label="Submit" type="submit" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('hides icon when loading', () => {
    render(<Button label="Add" icon={<FaPlus data-testid="icon" />} loading={true} />);
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });
});
