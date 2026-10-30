import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeletePlanModal from '../Components/ReusableModal/DeletePlanModal';

// Mock CSS imports
vi.mock('../Components/ReusableModal/ReusableModal.css', () => ({}));

// Mock ReusableModal to render children and buttons directly
vi.mock('../Components/ReusableModal/ReusableModal', () => ({
  default: ({
    isOpen,
    children,
    primaryButtonText,
    secondaryButtonText,
    onPrimaryButtonClick,
    onSecondaryButtonClick,
    primaryButtonDisabled,
    primaryButtonLoading,
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        {children}
        <button onClick={onSecondaryButtonClick}>
          {secondaryButtonText}
        </button>
        <button
          onClick={onPrimaryButtonClick}
          disabled={primaryButtonDisabled}
          data-testid="primary-button"
        >
          {primaryButtonLoading ? 'Loading...' : primaryButtonText}
        </button>
      </div>
    );
  },
}));

// Mock PasswordInput
vi.mock('../Components/Input/Inputs', () => ({
  PasswordInput: ({ label, value, onChange, placeholder, error, ...props }) => (
    <div>
      <label>{label}</label>
      <input
        type="password"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-testid="password-input"
        {...(props.id ? { id: props.id } : {})}
      />
      {error && <span data-testid="error-message">{error}</span>}
    </div>
  ),
}));

// Mock react-icons
vi.mock('react-icons/io', () => ({
  IoMdAlert: () => <span data-testid="alert-icon" />,
}));

// Mock showToast
vi.mock('../Helper/ShowToast', () => ({
  showToast: vi.fn(),
}));

const plan = { id: 'plan-1', name: 'Premium Plan' };

describe('DeletePlanModal', () => {
  it('does not render when closed', () => {
    render(
      <DeletePlanModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
      />
    );
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders plan name when open', () => {
    render(
      <DeletePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
      />
    );
    expect(
      screen.getByText(/Premium Plan/)
    ).toBeInTheDocument();
  });

  it('password input renders', () => {
    render(
      <DeletePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
      />
    );
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
  });

  it('delete button is disabled when password is empty', () => {
    render(
      <DeletePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
      />
    );
    expect(screen.getByTestId('primary-button')).toBeDisabled();
  });

  it('calls onConfirm with password on submit', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeletePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        plan={plan}
      />
    );
    const input = screen.getByTestId('password-input');
    fireEvent.change(input, { target: { value: 'secret123' } });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        plan,
        administratorPassword: 'secret123',
      });
    });
  });

  it('shows loading state', () => {
    // Render with a never-resolving onConfirm to keep loading
    const onConfirm = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <DeletePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        plan={plan}
      />
    );
    const input = screen.getByTestId('password-input');
    fireEvent.change(input, { target: { value: 'secret123' } });
    fireEvent.click(screen.getByTestId('primary-button'));

    return waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
