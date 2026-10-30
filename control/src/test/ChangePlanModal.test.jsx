import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePlanModal from '../Components/ReusableModal/ChangePlanModal';

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
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        {children}
        <button
          onClick={onSecondaryButtonClick}
        >
          {secondaryButtonText}
        </button>
        <button
          onClick={onPrimaryButtonClick}
          disabled={primaryButtonDisabled}
        >
          {primaryButtonText}
        </button>
      </div>
    );
  },
}));

// Mock SelectInput to render a real select
vi.mock('../Components/Input/Inputs', () => ({
  SelectInput: ({ label, value, onChange, options, disabled }) => (
    <div>
      <label>{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        data-testid={`select-${label}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

const plans = [
  { id: 'plan-1', name: 'Basic' },
  { id: 'plan-2', name: 'Pro' },
  { id: 'plan-3', name: 'Enterprise' },
];

describe('ChangePlanModal', () => {
  it('does not render when closed', () => {
    render(
      <ChangePlanModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders when open with current plan', () => {
    render(
      <ChangePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    // "Basic" appears in both the "Change from" and "Change to" dropdowns
    const basicOptions = screen.getAllByText('Basic');
    expect(basicOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('shows plan options in dropdown', () => {
    render(
      <ChangePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    const changeTo = screen.getByTestId('select-Change to');
    const options = changeTo.querySelectorAll('option');
    // "Select a plan" + 3 plans
    expect(options.length).toBe(4);
  });

  it('calls onSave with fromPlanId and toPlanId', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ChangePlanModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    const changeTo = screen.getByTestId('select-Change to');
    fireEvent.change(changeTo, { target: { value: 'plan-2' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        fromPlanId: 'plan-1',
        toPlanId: 'plan-2',
      });
    });
  });

  it('save button is disabled when no plan selected', () => {
    render(
      <ChangePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('resets selection when modal opens', () => {
    const { rerender } = render(
      <ChangePlanModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    rerender(
      <ChangePlanModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    const changeTo = screen.getByTestId('select-Change to');
    expect(changeTo.value).toBe('');
  });
});

describe('ChangePlanModal failure logging', () => {
  it('keeps a failed save out of the production console', async () => {
    vi.stubEnv('DEV', false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValue(new Error('nope'));
    const onClose = vi.fn();
    render(
      <ChangePlanModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        currentPlanId="plan-1"
        plans={plans}
      />
    );
    fireEvent.change(screen.getByTestId('select-Change to'), { target: { value: 'plan-2' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(spy).not.toHaveBeenCalled();
    // The modal stays open so the admin can retry.
    expect(onClose).not.toHaveBeenCalled();
    spy.mockRestore();
    vi.unstubAllEnvs();
  });
});
