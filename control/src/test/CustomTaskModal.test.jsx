import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

import CustomTaskModal from '../Components/ReusableModal/CustomTaskModal';

/**
 * The onboarding checklist's add/edit-a-task dialog.
 *
 * It doubles as both, deciding purely on whether `initialValues` was handed in:
 * that one prop swaps the heading and seeds the two fields. Anything falsy in
 * the seed falls back, so an `initialValues` of `{}` behaves like a fresh add.
 *
 * `handleSave` returns its promise chain, so `ReusableModal` treats every submit
 * as async: presses must be wrapped in `act` and awaited. That chain is also
 * where the field is cleared -- deliberately after the parent's save resolves,
 * so a rejected save leaves the typing intact and the dialog open.
 *
 * The checkbox's label carries no htmlFor, so it is reached through the input
 * itself rather than by clicking the text.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const nameField = () => screen.getByPlaceholderText('Type something');
const compulsory = () => document.body.querySelector('input[type="checkbox"]');

const renderModal = (props = {}) =>
  render(<CustomTaskModal isOpen onClose={onClose} onSave={onSave} {...props} />);

const save = async () => {
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

describe('which dialog it is', () => {
  it('offers to add a task when nothing was passed in', () => {
    renderModal();
    expect(screen.getByText('Add Custom Task')).toBeInTheDocument();
    expect(nameField().value).toBe('');
    expect(compulsory().checked).toBe(false);
  });

  it('offers to edit the task it was opened on', () => {
    renderModal({ initialValues: { name: 'Sign NDA', required: true } });
    expect(screen.getByText('Edit Custom Task')).toBeInTheDocument();
    expect(nameField().value).toBe('Sign NDA');
    expect(compulsory().checked).toBe(true);
  });

  // A caller that opens the edit form on a half-built row still gets usable
  // fields rather than React's uncontrolled-input warning.
  it('falls back to blank fields for a task with neither name nor flag', () => {
    renderModal({ initialValues: {} });
    expect(screen.getByText('Edit Custom Task')).toBeInTheDocument();
    expect(nameField().value).toBe('');
    expect(compulsory().checked).toBe(false);
  });

  it('reseeds itself each time it is reopened on a different task', async () => {
    const props = { onClose, onSave };
    const { rerender } = render(
      <CustomTaskModal isOpen {...props} initialValues={{ name: 'Sign NDA' }} />
    );
    rerender(<CustomTaskModal isOpen={false} {...props} />);
    rerender(
      <CustomTaskModal isOpen {...props} initialValues={{ name: 'Upload ID', required: true }} />
    );
    await waitFor(() => expect(nameField().value).toBe('Upload ID'));
    expect(compulsory().checked).toBe(true);
  });
});

describe('saving a task', () => {
  it('reports the trimmed name and the compulsory flag', async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: '  Sign NDA  ' } });
    fireEvent.click(compulsory());
    await save();
    expect(onSave).toHaveBeenCalledWith({ name: 'Sign NDA', required: true });
  });

  it('reports an optional task when the box is left alone', async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Sign NDA' } });
    await save();
    expect(onSave).toHaveBeenCalledWith({ name: 'Sign NDA', required: false });
  });

  it('unticks a box that was ticked', () => {
    renderModal();
    fireEvent.click(compulsory());
    expect(compulsory().checked).toBe(true);
    fireEvent.click(compulsory());
    expect(compulsory().checked).toBe(false);
  });

  it('empties itself and closes once the save lands', async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Sign NDA' } });
    fireEvent.click(compulsory());
    await save();
    expect(onClose).toHaveBeenCalled();
    expect(nameField().value).toBe('');
    expect(compulsory().checked).toBe(false);
  });

  it('refuses a name that is nothing but spaces', async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: '   ' } });
    await save();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the typing and stays open when the save is refused', async () => {
    onSave.mockRejectedValue(new Error('duplicate task'));
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Sign NDA' } });
    await save();
    expect(onClose).not.toHaveBeenCalled();
    expect(nameField().value).toBe('Sign NDA');
  });

  it('holds the save button down while the parent is working', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Sign NDA' } });

    await act(async () => {
      fireEvent.click(primary());
    });
    expect(primary()).toBeDisabled();

    await act(async () => {
      release();
    });
    expect(primary()).toBeEnabled();
  });
});

describe('dismissing the dialog', () => {
  it('empties itself without reporting anything', () => {
    renderModal({ initialValues: { name: 'Sign NDA', required: true } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(nameField().value).toBe('');
    expect(compulsory().checked).toBe(false);
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
