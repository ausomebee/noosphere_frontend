import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const spies = vi.hoisted(() => ({
  showValidationErrors: vi.fn(),
  clearDraft: vi.fn(),
}));

vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => spies.showValidationErrors(...a),
}));
// Stubbed out so the form never touches the persisted formDrafts slice; the
// hook's own behaviour is covered by its dedicated suites.
vi.mock('../hooks/useReduxFormDraft', () => ({ default: () => spies.clearDraft }));

import ResumeSubscriptionModal from '../Components/ReusableModal/SubcriptionModals/ResumeSubscriptionModal';

/**
 * The bulk resume-a-subscription form, the mirror image of the pause modal.
 *
 * The resumption type is a radio group that rewrites the rest of the form:
 * picking "Resume on a specific date" mounts a datetime field that yup then
 * makes required, and going back to "Resume now" unmounts it again. Since the
 * schema keys off the watched resumptionType, that required/nullable pair can
 * only be exercised through the radios.
 *
 * The payload carries two fallbacks -- the comment is only included when
 * non-empty, and a blank specificDate collapses to `undefined` -- so the object
 * handed to onSave differs in shape, not just in values, between the two types.
 *
 * The reason picker is a native <select>; its own blank "Select" entry is
 * dropped on the way in because SelectInput discards empty-valued options and
 * renders its own placeholder instead.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const selectedItems = [{ id: 'sub-9' }, { id: 'sub-10' }];

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const radio = (value) =>
  document.body.querySelector(`input[type="radio"][value="${value}"]`);
const reason = () => document.body.querySelector('select');
const comment = () => screen.getByPlaceholderText('Type Something');
const notify = () => document.body.querySelector('input[type="checkbox"]');
const dateField = () => screen.queryByPlaceholderText('Select');

const renderModal = (props = {}) =>
  render(
    <ResumeSubscriptionModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      selectedItems={selectedItems}
      {...props}
    />
  );

const submit = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the resumption type', () => {
  it('starts on an immediate resume with no date to give', () => {
    renderModal();
    expect(primary().textContent).toBe('Resume');
    expect(radio('now').checked).toBe(true);
    expect(dateField()).toBeNull();
  });

  it('asks for a date once a specific date is picked', () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    expect(dateField()).toBeInTheDocument();
    expect(dateField().type).toBe('datetime-local');
  });

  it('takes the date field away again when the resume goes back to now', () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    expect(dateField()).toBeInTheDocument();
    fireEvent.click(radio('now'));
    expect(dateField()).toBeNull();
  });

  it('offers every reason the product recognises', () => {
    renderModal();
    for (const label of ['Tenant Request', 'Issue Resolution', 'Other']) {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    }
    // The schema's own blank "Select" entry is dropped and replaced by the
    // input's generic placeholder, so exactly one empty option survives.
    const blanks = [...reason().options].filter((o) => o.value === '');
    expect(blanks).toHaveLength(1);
    expect(blanks[0].textContent).toBe('-- Select --');
  });

  it('renders nothing at all while closed', () => {
    renderModal({ isOpen: false });
    expect(primary()).toBeNull();
  });
});

describe('what the form refuses', () => {
  it('refuses a resume with no reason chosen', async () => {
    renderModal();
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(await screen.findByText('Reason is required')).toBeInTheDocument();
  });

  it('refuses a specific-date resume with no date', async () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText('Specific date is required')).toBeInTheDocument();
  });

  it('refuses a comment longer than a thousand characters', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.change(comment(), { target: { value: 'x'.repeat(1001) } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Comment must not exceed 1000 characters')
    ).toBeInTheDocument();
  });
});

describe('submitting a resume', () => {
  it('sends the bare immediate case with neither comment nor date', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Issue Resolution' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      items: selectedItems,
      resumptionType: 'now',
      reason: 'Issue Resolution',
      notifyTenant: false,
      specificDate: undefined,
    });
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('comment');
  });

  it('includes the comment and the notify flag when they are given', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'other' } });
    fireEvent.change(comment(), { target: { value: 'Billing dispute settled' } });
    fireEvent.click(notify());
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: 'Billing dispute settled',
        notifyTenant: true,
      })
    );
  });

  it('sends the start date for a specific-date resume', async () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.change(dateField(), { target: { value: '2026-12-01T09:00' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        resumptionType: 'specificDate',
        specificDate: '2026-12-01T09:00',
      })
    );
  });

  it('drops the saved draft and closes once the resume lands', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    await submit();

    expect(spies.clearDraft).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the draft and stays open when the resume is refused', async () => {
    onSave.mockRejectedValue(new Error('subscription is not paused'));
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.change(comment(), { target: { value: 'Second attempt' } });
    await submit();

    expect(spies.clearDraft).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(comment().value).toBe('Second attempt');
    await waitFor(() => expect(primary()).toBeEnabled());
  });

  it('locks the button while the resume is in flight', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });

    await submit();
    expect(primary()).toBeDisabled();

    await act(async () => {
      release();
    });
    await waitFor(() => expect(primary()).toBeEnabled());
  });

  // The hidden submit button exists so Enter inside a field still submits.
  it('submits when the form itself is submitted', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    await act(async () => {
      fireEvent.submit(document.body.querySelector('form.modal-form'));
    });
    expect(onSave).toHaveBeenCalled();
  });
});

describe('dismissing the dialog', () => {
  it('puts the form back to its defaults on cancel', async () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(radio('now').checked).toBe(true));
    expect(reason().value).toBe('');
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
