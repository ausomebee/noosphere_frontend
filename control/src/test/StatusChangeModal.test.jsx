import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatusChangeModal from '../Components/ReusableModal/StatusChangeModal';

// Mock CSS imports
vi.mock('../Components/ReusableModal/ReusableModal.css', () => ({}));

// Mock ReusableModal
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

const plan = { id: 'plan-1', name: 'Standard Plan' };

describe('StatusChangeModal', () => {
  it('shows "Activate" text when action is "activate"', () => {
    render(
      <StatusChangeModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
        action="activate"
      />
    );
    expect(screen.getByText('Activate Plan')).toBeInTheDocument();
    expect(
      screen.getByText(/activate the Standard Plan/)
    ).toBeInTheDocument();
  });

  it('shows "Deactivate" text when action is "deactivate"', () => {
    render(
      <StatusChangeModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
        action="deactivate"
      />
    );
    expect(screen.getByText('Deactivate Plan')).toBeInTheDocument();
    expect(
      screen.getByText(/deactivate the Standard Plan/)
    ).toBeInTheDocument();
  });

  it('password input renders', () => {
    render(
      <StatusChangeModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
        action="activate"
      />
    );
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
  });

  it('confirm button is disabled when password is empty', () => {
    render(
      <StatusChangeModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        plan={plan}
        action="activate"
      />
    );
    expect(screen.getByTestId('primary-button')).toBeDisabled();
  });

  it('calls onConfirm with password', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <StatusChangeModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        plan={plan}
        action="activate"
      />
    );
    const input = screen.getByTestId('password-input');
    fireEvent.change(input, { target: { value: 'admin123' } });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        plan,
        action: 'activate',
        administratorPassword: 'admin123',
      });
    });
  });

  it('shows loading state', () => {
    const onConfirm = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <StatusChangeModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        plan={plan}
        action="deactivate"
      />
    );
    const input = screen.getByTestId('password-input');
    fireEvent.change(input, { target: { value: 'admin123' } });
    fireEvent.click(screen.getByTestId('primary-button'));

    return waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
