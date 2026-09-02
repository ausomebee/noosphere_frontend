import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

import CancelSubscriptionModal from '../Components/ReusableModal/SubcriptionModals/CancelSubscriptionModal';

/**
 * The bulk cancel-subscription dialog.
 *
 * The payload it builds is conditional in two places: an empty comment is left
 * out of the request entirely rather than sent as `""`, and `notifyTenant` is
 * always sent even though the form has no control that sets it — so it is
 * always `false`. Both are pinned below.
 *
 * The acknowledgement checkbox is the one rule that cannot be satisfied by
 * typing, so it is the reliable way to prove validation blocks the submit.
 */

const onClose = vi.fn();
const onSave = vi.fn();
const selectedItems = [{ id: 's1' }, { id: 's2' }];

const renderModal = (props = {}) =>
  render(
    <CancelSubscriptionModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      selectedItems={selectedItems}
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const reasonSelect = () => document.body.querySelector('.modal-form select');
const commentBox = () => screen.getByPlaceholderText('Type Something');
const acknowledgement = () =>
  document.body.querySelector('input[name="understandIrreversible"]');
const radioFor = (value) =>
  document.body.querySelector(`input[type="radio"][value="${value}"]`);

const submit = async () => {
  await act(async () => { fireEvent.click(primary()); });
};

const fillValid = () => {
  fireEvent.change(reasonSelect(), { target: { value: 'Tenant Request' } });
  fireEvent.click(acknowledgement());
};

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the form it opens with', () => {
  it('preselects an immediate cancellation', () => {
    renderModal();
    expect(radioFor('immediately').checked).toBe(true);
    expect(radioFor('endOfCycle').checked).toBe(false);
  });

  it('offers the end-of-cycle option too', () => {
    renderModal();
    expect(
      screen.getByText('Cancel at the end of the billing cycle')
    ).toBeInTheDocument();
  });

  it('starts with nothing acknowledged and no reason chosen', () => {
    renderModal();
    expect(acknowledgement().checked).toBe(false);
    expect(reasonSelect().value).toBe('');
  });
});

describe('validation', () => {
  it('refuses a form with no reason and no acknowledgement', async () => {
    renderModal();
    await submit();
    await waitFor(() =>
      expect(screen.getByText('Reason is required')).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('still refuses once only the reason is chosen', async () => {
    renderModal();
    fireEvent.change(reasonSelect(), { target: { value: 'Terms Violation' } });
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows nothing on screen when only the acknowledgement is missing', async () => {
    // `CheckboxInput` takes no `error` prop — it spreads the whole rest of its
    // props onto the input — so the "You must acknowledge this action" message
    // is computed and then dropped. The only feedback is the toast.
    renderModal();
    fireEvent.change(reasonSelect(), { target: { value: 'Terms Violation' } });
    await submit();
    await waitFor(() => expect(showValidationErrors).toHaveBeenCalled());
    expect(
      screen.queryByText('You must acknowledge this action')
    ).not.toBeInTheDocument();
  });

  it('refuses a comment over a thousand characters', async () => {
    renderModal();
    fillValid();
    fireEvent.change(commentBox(), { target: { value: 'x'.repeat(1001) } });
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText('Comment must not exceed 1000 characters')
      ).toBeInTheDocument()
    );
  });
});

describe('the payload it sends', () => {
  it('cancels the selected subscriptions immediately', async () => {
    renderModal();
    fillValid();
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      items: selectedItems,
      cancellationType: 'immediately',
      reason: 'Tenant Request',
      // No comment key at all, rather than an empty one.
      notifyTenant: false,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('cancels at the end of the cycle when that is chosen', async () => {
    renderModal();
    fireEvent.click(radioFor('endOfCycle'));
    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].cancellationType).toBe('endOfCycle');
  });

  it('includes a comment when one was written', async () => {
    renderModal();
    fillValid();
    fireEvent.change(commentBox(), { target: { value: 'Migrating to a new plan.' } });
    await submit();
    expect(onSave.mock.calls[0][0].comment).toBe('Migrating to a new plan.');
  });

  it('leaves the comment out when the box is left empty', async () => {
    renderModal();
    fillValid();
    fireEvent.change(commentBox(), { target: { value: '' } });
    await submit();
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('comment');
  });

  it('always reports the tenant as not notified', async () => {
    // The form has no control bound to `notifyTenant`, so the fallback is the
    // only value this field can ever take.
    renderModal();
    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].notifyTenant).toBe(false);
  });

  it.each([
    'Terms Violation',
    'No Usage/Inactivity',
    'Compliance Requirement',
    'other',
  ])('sends the reason %s', async (reason) => {
    renderModal();
    fireEvent.change(reasonSelect(), { target: { value: reason } });
    fireEvent.click(acknowledgement());
    await submit();
    expect(onSave.mock.calls[0][0].reason).toBe(reason);
  });
});

describe('when the cancellation is refused', () => {
  it('stays open with everything the user entered', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    fillValid();
    fireEvent.change(commentBox(), { target: { value: 'Please cancel.' } });
    await submit();

    expect(onClose).not.toHaveBeenCalled();
    expect(commentBox().value).toBe('Please cancel.');
    expect(reasonSelect().value).toBe('Tenant Request');
  });
});

describe('closing', () => {
  it('empties the form on cancel', () => {
    renderModal();
    fireEvent.change(commentBox(), { target: { value: 'Never mind.' } });
    fireEvent.click(document.body.querySelector('.secondary-button'));
    expect(onClose).toHaveBeenCalled();
    expect(commentBox().value).toBe('');
  });

  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Cancel Subscription')).not.toBeInTheDocument();
  });
});
