import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mutable so a single test can render the modal against an empty store and see
// the SelectInput's empty-state hint instead of its usual placeholder.
let featureGroups = [];

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (fn) => fn({ featureManagement: { featureGroups } }),
}));

import EditFeatureGroupModal from '../Components/ReusableModal/EditFeatureGroupModal';

/**
 * The rename-a-feature-group dialog.
 *
 * It is two coupled fields: a native picker of the groups already in the store,
 * and a text box that the picker copies its choice into so the old name can be
 * edited in place. The text box stays disabled until something is picked, and an
 * effect wipes it again whenever the picker goes back to empty.
 *
 * The modal computes a `primaryButtonDisabled` that control's `ReusableModal`
 * throws away, so every "you cannot save yet" rule is really the guard inside
 * handleSave. Those are exercised by pressing Save anyway and asserting that
 * nothing was reported.
 *
 * The picker is a native <select> that drops any option whose value is the empty
 * string, so the modal's own hand-written placeholder entry never renders.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const picker = () => document.body.querySelector('select');
const titleField = () => screen.getByPlaceholderText('Enter feature group title');

const renderModal = (props = {}) =>
  render(
    <EditFeatureGroupModal isOpen onClose={onClose} onSave={onSave} {...props} />
  );

beforeEach(() => {
  vi.clearAllMocks();
  featureGroups = [
    { id: 'g1', title: 'Billing' },
    { id: 'g2', title: 'Scheduling' },
  ];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the group picker', () => {
  it('offers every group the store knows about', () => {
    renderModal();
    expect(screen.getByRole('option', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Scheduling' })).toBeInTheDocument();
  });

  it('drops the modal\'s own blank placeholder in favour of the input\'s', () => {
    renderModal();
    const blanks = [...picker().options].filter((o) => o.value === '');
    expect(blanks).toHaveLength(1);
    expect(blanks[0].textContent).toBe(
      '-- Select Select Feature Group Title to Edit --'
    );
  });

  it('says where to make a group when the store has none', () => {
    featureGroups = [];
    renderModal();
    expect(
      screen.getByText('No feature groups found. Create one in Feature Management.')
    ).toBeInTheDocument();
  });

  it('cannot be touched while a save is in flight', () => {
    renderModal({ isLoading: true });
    expect(picker()).toBeDisabled();
  });
});

describe('the title field', () => {
  it('stays disabled until a group is picked', () => {
    renderModal();
    expect(titleField()).toBeDisabled();
  });

  it('takes the picked group\'s name as its starting value', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Scheduling' } });
    await waitFor(() => expect(titleField().value).toBe('Scheduling'));
    expect(titleField()).toBeEnabled();
  });

  it('empties again when the picker goes back to nothing', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Scheduling' } });
    await waitFor(() => expect(titleField().value).toBe('Scheduling'));

    fireEvent.change(picker(), { target: { value: '' } });
    await waitFor(() => expect(titleField().value).toBe(''));
    expect(titleField()).toBeDisabled();
  });
});

describe('saving a rename', () => {
  it('reports the old and the new name, trimmed', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Billing' } });
    await waitFor(() => expect(titleField().value).toBe('Billing'));

    fireEvent.change(titleField(), { target: { value: '  Invoicing  ' } });
    fireEvent.click(primary());

    expect(onSave).toHaveBeenCalledWith({
      oldTitle: 'Billing',
      newTitle: 'Invoicing',
    });
  });

  it('empties itself once the rename is reported', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Billing' } });
    await waitFor(() => expect(titleField().value).toBe('Billing'));
    fireEvent.change(titleField(), { target: { value: 'Invoicing' } });
    fireEvent.click(primary());

    await waitFor(() => expect(picker().value).toBe(''));
    expect(titleField().value).toBe('');
  });

  it('does nothing when no group has been picked', () => {
    renderModal();
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing when the name has been blanked out', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Billing' } });
    await waitFor(() => expect(titleField().value).toBe('Billing'));

    fireEvent.change(titleField(), { target: { value: '   ' } });
    fireEvent.click(primary());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('still reports a rename that only changes the casing', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Billing' } });
    await waitFor(() => expect(titleField().value).toBe('Billing'));

    fireEvent.change(titleField(), { target: { value: 'BILLING' } });
    fireEvent.click(primary());
    expect(onSave).toHaveBeenCalledWith({
      oldTitle: 'Billing',
      newTitle: 'BILLING',
    });
  });
});

describe('dismissing the dialog', () => {
  it('forgets the picked group and the typed name', async () => {
    renderModal();
    fireEvent.change(picker(), { target: { value: 'Billing' } });
    await waitFor(() => expect(titleField().value).toBe('Billing'));
    fireEvent.change(titleField(), { target: { value: 'Invoicing' } });

    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(picker().value).toBe(''));
    expect(titleField().value).toBe('');
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
