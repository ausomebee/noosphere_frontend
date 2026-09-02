import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import DeleteConfirmationModal from '../Components/ReusableModal/SecondDeleteConfirmationModal';

/**
 * The escalating delete confirmation.
 *
 * It runs as a small state machine over three steps, and which step it starts
 * on depends on what it is deleting: a feature-group deletion begins at step 0
 * with a group picker, while a feature deletion skips straight to the warning.
 * `requirePassword` then decides whether the warning's button confirms outright
 * or advances to an administrative-password step.
 *
 * The payload differs per mode too -- a feature deletion reports the ids it was
 * given, a group deletion reports the group the user picked -- so both are
 * pinned separately.
 */

const featureGroups = [{ title: 'Billing' }, { title: 'Scheduling' }];

const makeStore = (groups = featureGroups) =>
  configureStore({
    reducer: { featureManagement: (state = { featureGroups: groups }) => state },
  });

const onCancel = vi.fn();
const onConfirm = vi.fn();

const renderModal = (props = {}, store = makeStore()) =>
  render(
    <Provider store={store}>
      <DeleteConfirmationModal
        isOpen
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="Delete this feature?"
        message="This cannot be undone."
        {...props}
      />
    </Provider>
  );

const primary = () => document.body.querySelector('.primary-button');

// ReusableModal locks its primary button for 600ms after every synchronous
// submit, so stepping through the wizard means letting that lock expire.
const clickPrimary = () => {
  fireEvent.click(primary());
  act(() => { vi.advanceTimersByTime(700); });
};
const password = () => screen.getByPlaceholderText('Enter your Administrative password');

// Control's SelectInput is a native <select>, unlike the other two apps'.
const groupSelect = () => document.body.querySelector('.modal-form select');
const pickGroup = (value = 'Billing') =>
  fireEvent.change(groupSelect(), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('deleting a feature group', () => {
  it('starts on the group picker', () => {
    renderModal();
    expect(screen.getByText('Select Feature Group to Delete')).toBeInTheDocument();
    expect(primary().textContent).toBe('Next');
  });

  it('offers the groups the store knows about', () => {
    renderModal();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
  });

  it('prefers groups handed to it over the ones in the store', () => {
    renderModal({ featureGroupOptions: [{ value: 'Supplied', label: 'Supplied' }] });
    expect(screen.getByText('Supplied')).toBeInTheDocument();
    expect(screen.queryByText('Billing')).not.toBeInTheDocument();
  });

  it('hints when the store has no groups at all', () => {
    renderModal({}, makeStore([]));
    expect(
      screen.getByText('No feature groups found. Create one in Feature Management.')
    ).toBeInTheDocument();
  });

  it('will not advance until a group is chosen', () => {
    // The modal ignores `primaryButtonDisabled`, so the button stays live and
    // the guard inside the handler is what actually holds the wizard back.
    renderModal();
    clickPrimary();
    expect(screen.getByText('Select Feature Group to Delete')).toBeInTheDocument();

    pickGroup();
    clickPrimary();
    expect(screen.queryByText('Select Feature Group to Delete')).not.toBeInTheDocument();
  });

  it('goes straight past the warning when no password is required', () => {
    // `handleSelectGroup` jumps to step 2 unless a password is required, so the
    // message on step 1 is never shown in this mode.
    renderModal();
    pickGroup();
    clickPrimary();
    expect(screen.getByText('Delete this feature?')).toBeInTheDocument();
    expect(screen.queryByText('This cannot be undone.')).not.toBeInTheDocument();
    expect(
      screen.getByText('Enter administrative password to complete this action')
    ).toBeInTheDocument();
  });

  it('shows the warning first when a password is required', () => {
    renderModal({ requirePassword: true });
    pickGroup();
    clickPrimary();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('reports the chosen group when it confirms outright', () => {
    renderModal();
    pickGroup();
    clickPrimary();
    clickPrimary();
    expect(onConfirm).toHaveBeenCalledWith({
      selectedGroup: 'Billing',
      administratorPassword: '',
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it('goes on to ask for a password when one is required', () => {
    renderModal({ requirePassword: true });
    pickGroup();
    clickPrimary();
    clickPrimary();
    expect(
      screen.getByText('Enter administrative password to complete this action')
    ).toBeInTheDocument();
    expect(primary().textContent).toBe('Complete');
  });

  it('reports the group alongside the password it was given', () => {
    renderModal({ requirePassword: true });
    pickGroup();
    clickPrimary();
    clickPrimary();
    fireEvent.change(password(), { target: { value: 'letmein' } });
    clickPrimary();
    expect(onConfirm).toHaveBeenCalledWith({
      selectedGroup: 'Billing',
      administratorPassword: 'letmein',
    });
  });
});

describe('deleting a single feature', () => {
  const asFeature = (over = {}) => ({
    isFeatureDeletion: true,
    groupTitle: 'Billing',
    featureId: 'f1',
    ...over,
  });

  it('skips the picker and opens on the warning', () => {
    renderModal(asFeature());
    expect(screen.queryByText('Select Feature Group to Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Delete this feature?')).toBeInTheDocument();
    expect(primary().textContent).toBe('Remove');
  });

  it('reports the ids it was given', () => {
    renderModal(asFeature());
    clickPrimary();
    expect(onConfirm).toHaveBeenCalledWith({
      groupTitle: 'Billing',
      featureId: 'f1',
      administratorPassword: '',
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it('asks for a password first when one is required', () => {
    renderModal(asFeature({ requirePassword: true }));
    clickPrimary();
    expect(
      screen.getByText('Enter administrative password to complete this action')
    ).toBeInTheDocument();
  });

  it('holds the password step until something is typed', () => {
    renderModal(asFeature({ requirePassword: true }));
    clickPrimary();

    // Again the disabled prop is inert, so the handler's own guard is what
    // refuses a blank or whitespace-only password.
    clickPrimary();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(password(), { target: { value: '   ' } });
    clickPrimary();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(password(), { target: { value: 'letmein' } });
    clickPrimary();
    expect(onConfirm).toHaveBeenCalled();
  });

  it('reports the password with the ids', () => {
    renderModal(asFeature({ requirePassword: true }));
    clickPrimary();
    fireEvent.change(password(), { target: { value: 'letmein' } });
    clickPrimary();
    expect(onConfirm).toHaveBeenCalledWith({
      groupTitle: 'Billing',
      featureId: 'f1',
      administratorPassword: 'letmein',
    });
  });
});

describe('its chrome', () => {
  it('uses the caller wording and colour for the confirm button', () => {
    renderModal({
      isFeatureDeletion: true,
      confirmButtonText: 'Destroy',
      confirmButtonColor: '#000000',
    });
    expect(primary().textContent).toBe('Destroy');
  });

  it('draws the caller icon in place of its own', () => {
    const Icon = (props) => <svg data-testid="custom-icon" {...props} />;
    renderModal({ isFeatureDeletion: true, icon: Icon });
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('draws its own warning icon when the caller gives none', () => {
    renderModal({ isFeatureDeletion: true });
    expect(document.body.querySelector('.warning-icon')).toBeInTheDocument();
  });

  it('locks the confirm button while a delete is in flight', () => {
    renderModal({ isFeatureDeletion: true, isLoading: true });
    expect(primary()).toBeDisabled();
    // `secondaryButtonDisabled` is not a prop this modal understands, so Cancel
    // stays live even mid-delete.
    expect(screen.getByText('Cancel')).not.toBeDisabled();
  });

  it('disables the password field while a delete is in flight', () => {
    const { rerender } = renderModal({ isFeatureDeletion: true, requirePassword: true });
    clickPrimary();
    rerender(
      <Provider store={makeStore()}>
        <DeleteConfirmationModal
          isOpen
          onCancel={onCancel}
          onConfirm={onConfirm}
          title="Delete this feature?"
          message="This cannot be undone."
          isFeatureDeletion
          requirePassword
          isLoading
        />
      </Provider>
    );
    expect(password()).toBeDisabled();
  });

  it('abandons everything on cancel', () => {
    renderModal({ isFeatureDeletion: true, requirePassword: true });
    clickPrimary();
    fireEvent.change(password(), { target: { value: 'letmein' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts afresh each time it is reopened', async () => {
    const { rerender } = renderModal({ requirePassword: true });
    pickGroup();
    clickPrimary();
    expect(screen.getByText('Delete this feature?')).toBeInTheDocument();

    const closed = (
      <Provider store={makeStore()}>
        <DeleteConfirmationModal
          isOpen={false}
          onCancel={onCancel}
          onConfirm={onConfirm}
          title="Delete this feature?"
          message="This cannot be undone."
          requirePassword
        />
      </Provider>
    );
    rerender(closed);
    rerender(
      <Provider store={makeStore()}>
        <DeleteConfirmationModal
          isOpen
          onCancel={onCancel}
          onConfirm={onConfirm}
          title="Delete this feature?"
          message="This cannot be undone."
          requirePassword
        />
      </Provider>
    );
    await waitFor(() =>
      expect(screen.getByText('Select Feature Group to Delete')).toBeInTheDocument()
    );
  });

  it('renders nothing at all while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Select Feature Group to Delete')).not.toBeInTheDocument();
  });
});

describe('the footer layout', () => {
  it('centres the footer when only the confirm button is shown', () => {
    renderModal({ isFeatureDeletion: true, showSecondaryButton: false });
    expect(document.body.querySelector('.modal-buttons')).toHaveClass('center-footer');
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('centres the footer when only the cancel button is shown', () => {
    renderModal({ isFeatureDeletion: true, showConfirmButton: false });
    expect(document.body.querySelector('.modal-buttons')).toHaveClass('center-footer');
    expect(primary()).toBeNull();
  });

  it('leaves the footer alone when both buttons are shown', () => {
    renderModal({ isFeatureDeletion: true });
    expect(document.body.querySelector('.modal-buttons')).not.toHaveClass('center-footer');
  });

  it('leaves the footer alone when neither button is shown', () => {
    renderModal({
      isFeatureDeletion: true,
      showConfirmButton: false,
      showSecondaryButton: false,
    });
    expect(document.body.querySelector('.modal-buttons')).not.toHaveClass('center-footer');
  });
});

describe('cancelling from the other two openings', () => {
  it('abandons a group deletion and rewinds to the picker', () => {
    renderModal();
    pickGroup();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('abandons a feature deletion that never asked for a password', () => {
    renderModal({ isFeatureDeletion: true, groupTitle: 'Billing', featureId: 'f1' });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
