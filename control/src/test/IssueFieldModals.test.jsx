import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const showValidationErrors = vi.fn();
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

import ChangeStatusModal from '../Components/ReusableModal/IssueViewModals/ChangeStatusModal';
import ChangeCategoryModal from '../Components/ReusableModal/IssueViewModals/ChangeCategoryModal';
import AddCommentModal from '../Components/ReusableModal/IssueViewModals/AddCommentModal';

/**
 * The three smallest dialogs on the issue-detail page.
 *
 * The two "change X" modals are the same component twice over: a read-only
 * "from" field seeded from the issue, a "to" field, and a yup rule that the two
 * must differ. The seeding effect has an else arm that resets the form, which is
 * what runs when the issue has no status or category at all — that case matters
 * because such an issue would otherwise be unchangeable.
 *
 * All three swallow a rejected save on purpose: the parent has already reported
 * it, and the modal stays open so the user's typing survives.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const save = async () => { await act(async () => { fireEvent.click(primary()); }); };

const selectFor = (label) =>
  screen.getByText(label).closest('.input-group').querySelector('select');

beforeEach(() => {
  vi.clearAllMocks();
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('changing an issue status', () => {
  const renderModal = (props = {}) =>
    render(
      <ChangeStatusModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialStatus="Not Started"
        {...props}
      />
    );

  it('seeds and locks the current status', () => {
    renderModal();
    expect(selectFor('Change from').value).toBe('Not Started');
    expect(selectFor('Change from')).toBeDisabled();
  });

  it('leaves the current status open when the issue has none', () => {
    renderModal({ initialStatus: undefined });
    expect(selectFor('Change from').value).toBe('');
    expect(selectFor('Change from')).not.toBeDisabled();
  });

  it('saves the new status and closes', async () => {
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Resolved' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('Resolved');
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a blank new status', async () => {
    renderModal();
    await save();
    await waitFor(() =>
      expect(screen.getByText('New status is required')).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a new status identical to the current one', async () => {
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Not Started' } });
    await save();
    await waitFor(() =>
      expect(
        screen.getByText('New status must be different from the current status')
      ).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stays open when the parent rejects the change', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Resolved' } });
    await save();
    expect(onClose).not.toHaveBeenCalled();
    expect(selectFor('Change To').value).toBe('Resolved');
  });

  it('empties itself on cancel', () => {
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Resolved' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });

  it('reseeds each time it reopens', async () => {
    const props = { onClose, onSave, initialStatus: 'Not Started' };
    const { rerender } = renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Resolved' } });

    rerender(<ChangeStatusModal isOpen={false} {...props} />);
    rerender(<ChangeStatusModal isOpen {...props} />);
    await waitFor(() => expect(selectFor('Change from').value).toBe('Not Started'));
  });
});

describe('changing an issue category', () => {
  const renderModal = (props = {}) =>
    render(
      <ChangeCategoryModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        initialCategory="Bug Report"
        {...props}
      />
    );

  it('seeds and locks the current category', () => {
    renderModal();
    expect(selectFor('Change from').value).toBe('Bug Report');
    expect(selectFor('Change from')).toBeDisabled();
  });

  it('leaves the current category open when the issue has none', () => {
    renderModal({ initialCategory: undefined });
    expect(selectFor('Change from').value).toBe('');
  });

  it('saves the new category and closes', async () => {
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Performance' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('Performance');
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a blank new category', async () => {
    renderModal();
    await save();
    await waitFor(() =>
      expect(screen.getByText('New category is required')).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a new category identical to the current one', async () => {
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Bug Report' } });
    await save();
    await waitFor(() =>
      expect(
        screen.getByText('New category must be different from the current category')
      ).toBeInTheDocument()
    );
  });

  it('stays open when the parent rejects the change', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    fireEvent.change(selectFor('Change To'), { target: { value: 'Performance' } });
    await save();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('empties itself on cancel', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
  });
});

describe('adding a comment', () => {
  const renderModal = (props = {}) =>
    render(<AddCommentModal isOpen onClose={onClose} onSave={onSave} {...props} />);

  const box = () => screen.getByPlaceholderText('Type something...');

  it('saves a comment and closes', async () => {
    renderModal();
    fireEvent.change(box(), { target: { value: 'Looked into it.' } });
    await save();
    expect(onSave).toHaveBeenCalledWith('Looked into it.');
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a blank comment', async () => {
    renderModal();
    await save();
    await waitFor(() =>
      expect(screen.getByText('Comment is required')).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a comment that is only whitespace', async () => {
    renderModal();
    fireEvent.change(box(), { target: { value: '     ' } });
    await save();
    await waitFor(() =>
      expect(screen.getByText('Comment is required')).toBeInTheDocument()
    );
  });

  it('refuses a comment over five hundred characters', async () => {
    renderModal();
    fireEvent.change(box(), { target: { value: 'x'.repeat(501) } });
    await save();
    await waitFor(() =>
      expect(
        screen.getByText('Comment must not exceed 500 characters')
      ).toBeInTheDocument()
    );
  });

  it('stays open with the comment intact when the parent rejects it', async () => {
    onSave.mockRejectedValue(new Error('server said no'));
    renderModal();
    fireEvent.change(box(), { target: { value: 'Looked into it.' } });
    await save();
    expect(onClose).not.toHaveBeenCalled();
    expect(box().value).toBe('Looked into it.');
  });

  it('empties itself on cancel', () => {
    renderModal();
    fireEvent.change(box(), { target: { value: 'Never mind.' } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(box().value).toBe('');
  });
});
