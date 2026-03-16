import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Alert from '../Components/Alert/Alert';

// Mock the Button component to render a simple button
vi.mock('../Components/Button/Button', () => ({
  default: ({ label, onClick, variant, ...props }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {label}
    </button>
  ),
}));

describe('Alert', () => {
  it('renders message', () => {
    render(<Alert message="Something happened" />);
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    const { container } = render(
      <Alert message="Warning alert" variant="warning" />
    );
    expect(container.querySelector('.alert-warning')).toBeInTheDocument();
  });

  it('renders primary action button and fires callback', () => {
    const onClick = vi.fn();
    render(
      <Alert
        message="Test"
        primaryAction={{ label: 'Confirm', onClick }}
      />
    );
    const button = screen.getByText('Confirm');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button and fires callback', () => {
    const onClick = vi.fn();
    render(
      <Alert
        message="Test"
        secondaryAction={{ label: 'Dismiss', onClick }}
      />
    );
    const button = screen.getByText('Dismiss');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without actions', () => {
    const { container } = render(<Alert message="No actions" />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });
});
