import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock('../Helper/ShowToast', () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const state = {
  authentication: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } },
  featureManagement: {
    featureGroups: [
      { id: 'g1', title: 'Billing' },
      { id: 'g2', title: 'Scheduling' },
    ],
  },
};
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn(state),
}));

import ToggleActiveModal from '../Components/ReusableModal/ToggleActiveModal';
import CreateFeatureGroupModal from '../Components/ReusableModal/CreateFeatureGroupModal';
import MoveToFeatureGroupModal from '../Components/ReusableModal/MoveFeatureModal';
import TableFilterModal from '../Components/ReusableModal/TableFilterModal';
import StatusChangeModal from '../Components/ReusableModal/StatusChangeModal';
import AddNewFeatureModal from '../Components/ReusableModal/AddNewFeatureModal';

/**
 * The small single-purpose dialogs behind Feature Management and the plan list.
 *
 * They share one trap: control's `ReusableModal` ignores `primaryButtonDisabled`
 * entirely, so every "you cannot press this yet" rule these modals think they
 * have is really enforced by a guard inside the handler. Each of those guards is
 * exercised by pressing the button anyway and asserting nothing happened.
 *
 * The modal also locks its primary button for 600ms after a synchronous submit,
 * so anything that presses it twice runs on fake timers.
 */

const onClose = vi.fn();
const onSave = vi.fn();
const onConfirm = vi.fn();
const onApply = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
  onConfirm.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the enable/disable confirmation', () => {
  it.each([
    [false, 'Enable', 'enable', true],
    [true, 'Disable', 'disable', false],
  ])('offers to %s a feature', (currentState, buttonText, word, confirmed) => {
    render(
      <ToggleActiveModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        currentState={currentState}
      />
    );
    expect(primary().textContent).toBe(buttonText);
    expect(
      screen.getByText(`Are you sure you want to ${word} this feature?`)
    ).toBeInTheDocument();

    fireEvent.click(primary());
    expect(onConfirm).toHaveBeenCalledWith(confirmed);
  });

  it('closes on cancel without confirming', () => {
    render(
      <ToggleActiveModal isOpen onClose={onClose} onConfirm={onConfirm} currentState />
    );
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('locks the confirm button while the change is in flight', () => {
    render(
      <ToggleActiveModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        currentState
        isLoading
      />
    );
    expect(primary()).toBeDisabled();
  });
});

describe('creating a feature group', () => {
  const nameField = () => screen.getByPlaceholderText('Enter feature group title');

  it('saves a trimmed title and empties itself', () => {
    render(<CreateFeatureGroupModal isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.change(nameField(), { target: { value: '  Reporting  ' } });
    fireEvent.click(primary());

    expect(onSave).toHaveBeenCalledWith({ title: 'Reporting' });
    expect(nameField().value).toBe('');
  });

  it('does nothing at all for a blank title', () => {
    render(<CreateFeatureGroupModal isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.change(nameField(), { target: { value: '   ' } });
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('empties itself on cancel', () => {
    render(<CreateFeatureGroupModal isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.change(nameField(), { target: { value: 'Reporting' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(nameField().value).toBe('');
  });

  it('disables the field while a save is in flight', () => {
    render(<CreateFeatureGroupModal isOpen onClose={onClose} onSave={onSave} isLoading />);
    expect(nameField()).toBeDisabled();
  });
});

describe('moving a feature to another group', () => {
  const renderModal = (props = {}) =>
    render(
      <MoveToFeatureGroupModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        featureId="f1"
        currentGroupTitle="Billing"
        {...props}
      />
    );

  // The checkbox's label carries no htmlFor, so the input is found by the value
  // the modal gives it rather than through the text.
  const boxFor = (title) =>
    document.body.querySelector(`input[type="checkbox"][value="${title}"]`);

  it('lists every group in the store', () => {
    renderModal();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
  });

  it('reports the group that was ticked', () => {
    renderModal();
    fireEvent.click(boxFor('Scheduling'));
    fireEvent.click(primary());
    expect(onSave).toHaveBeenCalledWith({
      featureId: 'f1',
      fromGroupTitle: 'Billing',
      toGroupTitle: 'Scheduling',
    });
  });

  it('unticks a group that was already ticked', () => {
    renderModal();
    const box = boxFor('Scheduling');
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(box.checked).toBe(false);
  });

  it('just closes when the chosen group is the one it is already in', () => {
    renderModal();
    fireEvent.click(boxFor('Billing'));
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('just closes when nothing was ticked at all', () => {
    renderModal();
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('forgets the selection on cancel', () => {
    renderModal();
    fireEvent.click(boxFor('Scheduling'));
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });

  it('disables every group while a move is in flight', () => {
    renderModal({ isLoading: true });
    expect(boxFor('Scheduling')).toBeDisabled();
  });
});

describe('the table filter dialog', () => {
  const options = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
  ];

  const renderModal = (props = {}) =>
    render(
      <TableFilterModal
        isOpen
        onClose={onClose}
        onApply={onApply}
        title="Filter tenants"
        label="Status"
        options={options}
        {...props}
      />
    );

  it('applies the value that was chosen and closes', () => {
    renderModal();
    fireEvent.change(document.body.querySelector('select'), {
      target: { value: 'active' },
    });
    fireEvent.click(primary());
    expect(onApply).toHaveBeenCalledWith('active');
    expect(onClose).toHaveBeenCalled();
  });

  it('applies an empty value when nothing was chosen', () => {
    renderModal();
    fireEvent.click(primary());
    expect(onApply).toHaveBeenCalledWith('');
  });

  it('closes without applying anything', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('clears its value each time it reopens', () => {
    const { rerender } = renderModal();
    fireEvent.change(document.body.querySelector('select'), {
      target: { value: 'active' },
    });
    rerender(
      <TableFilterModal
        isOpen={false}
        onClose={onClose}
        onApply={onApply}
        title="Filter tenants"
        label="Status"
        options={options}
      />
    );
    rerender(
      <TableFilterModal
        isOpen
        onClose={onClose}
        onApply={onApply}
        title="Filter tenants"
        label="Status"
        options={options}
      />
    );
    expect(document.body.querySelector('select').value).toBe('');
  });
});

describe('activating and deactivating a plan', () => {
  const renderModal = (props = {}) =>
    render(
      <StatusChangeModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        plan={{ name: 'Pro' }}
        action="activate"
        {...props}
      />
    );

  const password = () =>
    screen.getByPlaceholderText('Enter your Administrative password');

  it.each([
    ['activate', 'Activate Plan', 'activate the Pro plan'],
    ['deactivate', 'Deactivate Plan', 'deactivate the Pro plan'],
  ])('titles and words itself for %s', (action, title, message) => {
    renderModal({ action });
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
  });

  it('names an unnamed plan', () => {
    renderModal({ plan: null });
    expect(screen.getByText(/Unnamed Plan/)).toBeInTheDocument();
  });

  it('refuses a blank password', async () => {
    renderModal();
    await act(async () => { fireEvent.click(primary()); });
    expect(showToast).toHaveBeenCalledWith(
      'Administrative password is required.',
      'error'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('refuses a password that is too short', async () => {
    renderModal();
    fireEvent.change(password(), { target: { value: 'abc' } });
    await act(async () => { fireEvent.click(primary()); });
    expect(showToast).toHaveBeenCalledWith(
      'Password must be at least 6 characters long.',
      'error'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms with the plan, the action and the password', async () => {
    renderModal();
    fireEvent.change(password(), { target: { value: 'letmein' } });
    await act(async () => { fireEvent.click(primary()); });
    expect(onConfirm).toHaveBeenCalledWith({
      plan: { name: 'Pro' },
      action: 'activate',
      administratorPassword: 'letmein',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open and reports a refused confirmation', async () => {
    onConfirm.mockRejectedValue(new Error('wrong password'));
    renderModal();
    fireEvent.change(password(), { target: { value: 'letmein' } });
    await act(async () => { fireEvent.click(primary()); });
    expect(showApiError).toHaveBeenCalledWith(
      expect.any(Error),
      'VERIFY_ADMIN_PASSWORD'
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('empties the password each time it reopens', async () => {
    const { rerender } = renderModal();
    fireEvent.change(password(), { target: { value: 'letmein' } });

    const props = { onClose, onConfirm, plan: { name: 'Pro' }, action: 'activate' };
    rerender(<StatusChangeModal isOpen={false} {...props} />);
    rerender(<StatusChangeModal isOpen {...props} />);
    await waitFor(() => expect(password().value).toBe(''));
  });

  it('closes on cancel without confirming', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('adding a feature to a group', () => {
  const renderModal = (props = {}) =>
    render(<AddNewFeatureModal isOpen onClose={onClose} onSave={onSave} {...props} />);

  const fieldFor = (label) =>
    screen.getByText(label).closest('.input-group').querySelector('input, select, textarea');

  it('offers the groups the store knows about', () => {
    renderModal();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
  });

  it('saves the new feature under the chosen group', () => {
    renderModal();
    fireEvent.change(fieldFor('Feature Group'), { target: { value: 'Billing' } });
    fireEvent.change(fieldFor('Feature Name'), { target: { value: '  Invoicing  ' } });
    fireEvent.change(fieldFor('Feature Description'), {
      target: { value: '  Send invoices  ' },
    });
    fireEvent.change(fieldFor('Managed By'), { target: { value: '  Ops  ' } });
    fireEvent.click(primary());

    const [payload] = onSave.mock.calls[0];
    expect(payload.groupTitle).toBe('Billing');
    expect(payload.feature).toEqual(
      expect.objectContaining({
        name: 'Invoicing',
        description: 'Send invoices',
        managedBy: 'Ops',
        active: true,
        selected: false,
      })
    );
    expect(payload.feature.id).toEqual(expect.any(String));
  });

  it('credits the current user when no manager is named', () => {
    renderModal();
    fireEvent.change(fieldFor('Feature Group'), { target: { value: 'Billing' } });
    fireEvent.change(fieldFor('Feature Name'), { target: { value: 'Invoicing' } });
    fireEvent.click(primary());
    expect(onSave.mock.calls[0][0].feature.managedBy).toBe('Current User');
  });

  it('does nothing without a group', () => {
    renderModal();
    fireEvent.change(fieldFor('Feature Name'), { target: { value: 'Invoicing' } });
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does nothing without a name', () => {
    renderModal();
    fireEvent.change(fieldFor('Feature Group'), { target: { value: 'Billing' } });
    fireEvent.change(fieldFor('Feature Name'), { target: { value: '   ' } });
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('records the active/disabled choice', () => {
    renderModal();
    fireEvent.change(fieldFor('Feature Group'), { target: { value: 'Billing' } });
    fireEvent.change(fieldFor('Feature Name'), { target: { value: 'Invoicing' } });
    fireEvent.change(fieldFor('Set Active or Disabled'), { target: { value: 'false' } });
    fireEvent.click(primary());
    expect(onSave.mock.calls[0][0].feature.active).toBe(false);
  });

  it('empties itself on cancel', () => {
    renderModal();
    fireEvent.change(fieldFor('Feature Name'), { target: { value: 'Invoicing' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(fieldFor('Feature Name').value).toBe('');
  });
});
