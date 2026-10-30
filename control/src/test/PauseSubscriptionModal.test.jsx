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

import PauseSubscriptionModal from '../Components/ReusableModal/SubcriptionModals/PauseSubscriptionModal';

/**
 * The bulk pause-a-subscription form.
 *
 * The pause type is a radio group that rewrites the rest of the form: picking
 * "Pause Until" or "Pause on a specific date" mounts a datetime field that yup
 * then makes conditionally required, and switching back unmounts it. Because the
 * schema keys off the watched pauseType, the required/nullable pair has to be
 * driven through the radios rather than by handing the form values directly.
 *
 * The payload is assembled with three fallbacks -- the comment is only included
 * when non-empty, and each date collapses to `undefined` when blank -- so the
 * submitted object differs in shape between pause types, not just in values.
 *
 * The reason picker is a native <select>, and its own "Select" entry is dropped
 * on the way in because SelectInput discards options whose value is empty and
 * renders its own placeholder instead.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const selectedItems = [{ id: 'sub-1' }, { id: 'sub-2' }];

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
    <PauseSubscriptionModal
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

describe('the pause type', () => {
  it('starts on an indefinite pause with no date to give', () => {
    renderModal();
    expect(primary().textContent).toBe('Pause Subscription');
    expect(radio('indefinitely').checked).toBe(true);
    expect(dateField()).toBeNull();
  });

  it('asks for a date once "Pause Until" is picked', () => {
    renderModal();
    fireEvent.click(radio('until'));
    expect(dateField()).toBeInTheDocument();
    expect(dateField().type).toBe('datetime-local');
  });

  it('asks for a date once a specific date is picked', () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    expect(dateField()).toBeInTheDocument();
  });

  it('takes the date field away again when the pause goes back to indefinite', () => {
    renderModal();
    fireEvent.click(radio('until'));
    expect(dateField()).toBeInTheDocument();
    fireEvent.click(radio('indefinitely'));
    expect(dateField()).toBeNull();
  });

  it('offers every reason the product recognises', () => {
    renderModal();
    for (const label of [
      'Tenant Request',
      'Terms Violation',
      'No Usage/Inactivity',
      'Compliance Requirement',
      'Other',
    ]) {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    }
    // The schema's own blank "Select" entry is dropped and replaced by the
    // input's generic placeholder, so exactly one empty option survives.
    const blanks = [...reason().options].filter((o) => o.value === '');
    expect(blanks).toHaveLength(1);
    expect(blanks[0].textContent).toBe('-- Select --');
  });
});

describe('what the form refuses', () => {
  it('refuses a pause with no reason chosen', async () => {
    renderModal();
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(await screen.findByText('Reason is required')).toBeInTheDocument();
  });

  it('refuses an until-pause with no date', async () => {
    renderModal();
    fireEvent.click(radio('until'));
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText('Until date is required')).toBeInTheDocument();
  });

  it('refuses a specific-date pause with no date', async () => {
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

describe('submitting a pause', () => {
  it('sends the bare indefinite case with neither comment nor dates', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Terms Violation' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      items: selectedItems,
      pauseType: 'indefinitely',
      reason: 'Terms Violation',
      notifyTenant: false,
      untilDate: undefined,
      specificDate: undefined,
    });
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('comment');
  });

  it('includes the comment and the notify flag when they are given', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'No Usage/Inactivity' } });
    fireEvent.change(comment(), { target: { value: 'Dormant since March' } });
    fireEvent.click(notify());
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: 'Dormant since March',
        notifyTenant: true,
      })
    );
  });

  it('sends the end date for an until-pause', async () => {
    renderModal();
    fireEvent.click(radio('until'));
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.change(dateField(), { target: { value: '2026-10-01T10:00' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        pauseType: 'until',
        untilDate: '2026-10-01T10:00',
        specificDate: undefined,
      })
    );
  });

  it('sends the start date for a specific-date pause', async () => {
    renderModal();
    fireEvent.click(radio('specificDate'));
    fireEvent.change(reason(), { target: { value: 'Compliance Requirement' } });
    fireEvent.change(dateField(), { target: { value: '2026-11-15T08:30' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        pauseType: 'specificDate',
        specificDate: '2026-11-15T08:30',
        untilDate: undefined,
      })
    );
  });

  it('drops the saved draft and closes once the pause lands', async () => {
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    await submit();

    expect(spies.clearDraft).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the draft and stays open when the pause is refused', async () => {
    onSave.mockRejectedValue(new Error('subscription already paused'));
    renderModal();
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.change(comment(), { target: { value: 'Second attempt' } });
    await submit();

    expect(spies.clearDraft).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(comment().value).toBe('Second attempt');
    await waitFor(() => expect(primary()).toBeEnabled());
  });

  it('locks the button while the pause is in flight', async () => {
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
    fireEvent.click(radio('until'));
    fireEvent.change(reason(), { target: { value: 'Tenant Request' } });
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(radio('indefinitely').checked).toBe(true));
    expect(reason().value).toBe('');
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
