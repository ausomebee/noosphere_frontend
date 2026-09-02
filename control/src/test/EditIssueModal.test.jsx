import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const spies = vi.hoisted(() => ({ showValidationErrors: vi.fn() }));

// The invalid-submit handler is control's own helper, not a ShowToast export;
// stubbing it keeps the assertions about "the form refused" rather than about
// toast plumbing.
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => spies.showValidationErrors(...a),
}));

import EditIssueModal from '../Components/ReusableModal/IssueViewModals/EditIssueModal';

/**
 * The rename-an-issue dialog on the issue detail view.
 *
 * It is a react-hook-form/yup form of two fields whose defaults come from the
 * issue that was open, each with an `|| ""` fallback so an issue lacking a
 * description still gives a controlled textarea. Both are trimmed and required,
 * and both are length-capped, so the interesting branches are the four ways yup
 * can refuse rather than any logic of the modal's own.
 *
 * Submission is async, so the primary button has to be pressed inside `act`.
 * `onSave` rejecting is a supported outcome: the parent has already told the
 * user, and the modal deliberately stays open with the edit intact.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const titleField = () => screen.getByPlaceholderText('Type something');
const descriptionField = () =>
  screen.getByPlaceholderText('Enter a detailed description of the issue');

const renderModal = (props = {}) =>
  render(
    <EditIssueModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialTitle="Login fails"
      initialDescription="Users cannot sign in"
      issueId="i1"
      adminId="a1"
      accessToken="at"
      refreshToken="rt"
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

describe('the starting values', () => {
  it('shows the issue it was opened on', () => {
    renderModal();
    expect(screen.getByText('Edit issue')).toBeInTheDocument();
    expect(titleField().value).toBe('Login fails');
    expect(descriptionField().value).toBe('Users cannot sign in');
  });

  it('starts blank for an issue with neither title nor description', () => {
    renderModal({ initialTitle: undefined, initialDescription: undefined });
    expect(titleField().value).toBe('');
    expect(descriptionField().value).toBe('');
  });
});

describe('what the form refuses', () => {
  it('refuses a title that is nothing but spaces', async () => {
    renderModal();
    fireEvent.change(titleField(), { target: { value: '   ' } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(spies.showValidationErrors).toHaveBeenCalled();
    expect(await screen.findByText('Issue title is required')).toBeInTheDocument();
  });

  it('refuses an emptied description', async () => {
    renderModal();
    fireEvent.change(descriptionField(), { target: { value: '' } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText('Description is required')).toBeInTheDocument();
  });

  it('refuses a title longer than a hundred characters', async () => {
    renderModal();
    fireEvent.change(titleField(), { target: { value: 'x'.repeat(101) } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Title must not exceed 100 characters')
    ).toBeInTheDocument();
  });

  it('refuses a description longer than a thousand characters', async () => {
    renderModal();
    fireEvent.change(descriptionField(), { target: { value: 'x'.repeat(1001) } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Description must not exceed 1000 characters')
    ).toBeInTheDocument();
  });

  it('hands both failures to the invalid-submit handler at once', async () => {
    renderModal({ initialTitle: '', initialDescription: '' });
    await submit();

    const [errors] = spies.showValidationErrors.mock.calls[0];
    expect(errors.issueTitle.message).toBe('Issue title is required');
    expect(errors.description.message).toBe('Description is required');
  });
});

describe('saving an edit', () => {
  it('reports the new title and description', async () => {
    renderModal();
    fireEvent.change(titleField(), { target: { value: 'Login fails on Safari' } });
    fireEvent.change(descriptionField(), { target: { value: 'Only in private mode' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      title: 'Login fails on Safari',
      description: 'Only in private mode',
    });
    expect(onClose).toHaveBeenCalled();
    expect(spies.showValidationErrors).not.toHaveBeenCalled();
  });

  // yup trims before the resolver hands values over, so what reaches the parent
  // never carries the user's stray whitespace.
  it('strips the padding off both fields before reporting them', async () => {
    renderModal();
    fireEvent.change(titleField(), { target: { value: '  Padded title  ' } });
    fireEvent.change(descriptionField(), { target: { value: '  Padded body  ' } });
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      title: 'Padded title',
      description: 'Padded body',
    });
  });

  it('stays open with the edit intact when the save is refused', async () => {
    onSave.mockRejectedValue(new Error('conflict'));
    renderModal();
    fireEvent.change(titleField(), { target: { value: 'Login fails on Safari' } });
    await submit();

    expect(onClose).not.toHaveBeenCalled();
    expect(titleField().value).toBe('Login fails on Safari');
    await waitFor(() => expect(primary()).toBeEnabled());
  });

  it('locks the save button while the parent is working', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();

    await submit();
    expect(primary()).toBeDisabled();

    await act(async () => {
      release();
    });
    await waitFor(() => expect(primary()).toBeEnabled());
  });
});

describe('dismissing the dialog', () => {
  it('discards the edit on cancel', async () => {
    renderModal();
    fireEvent.change(titleField(), { target: { value: 'Something else' } });
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(titleField().value).toBe('Login fails'));
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
