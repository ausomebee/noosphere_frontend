import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

import CustomDocumentModal from '../Components/ReusableModal/CustomDocumentModal';

/**
 * The request-a-document dialog from tenant onboarding.
 *
 * One component serves both the add and the edit case, picked purely on whether
 * `initialValues` was supplied -- that prop swaps the heading and seeds the name
 * and the compulsory flag, with a fallback on each so a half-built row still
 * yields controlled inputs.
 *
 * `handleSave` returns its promise chain, which makes every submit async as far
 * as `ReusableModal` is concerned: presses go through `act` and are awaited. The
 * chain clears the field only after the parent's save resolves, so a refused
 * save is expected to leave the typed name in place with the dialog still open.
 *
 * The checkbox's label carries no htmlFor, so it is driven through the input.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const nameField = () => screen.getByPlaceholderText('Type something');
const compulsory = () => document.body.querySelector('input[type="checkbox"]');

const renderModal = (props = {}) =>
  render(<CustomDocumentModal isOpen onClose={onClose} onSave={onSave} {...props} />);

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
  it('asks for a new document when nothing was passed in', () => {
    renderModal();
    expect(screen.getByText('Custom document request')).toBeInTheDocument();
    expect(nameField().value).toBe('');
    expect(compulsory().checked).toBe(false);
  });

  it('offers to edit the document it was opened on', () => {
    renderModal({ initialValues: { name: 'Passport', required: true } });
    expect(screen.getByText('Edit Custom Document')).toBeInTheDocument();
    expect(nameField().value).toBe('Passport');
    expect(compulsory().checked).toBe(true);
  });

  // An existing row with no name yet must still render controlled inputs.
  it('falls back to blank fields for a document with neither name nor flag', () => {
    renderModal({ initialValues: {} });
    expect(screen.getByText('Edit Custom Document')).toBeInTheDocument();
    expect(nameField().value).toBe('');
    expect(compulsory().checked).toBe(false);
  });

  it('reseeds itself each time it is reopened on a different document', async () => {
    const props = { onClose, onSave };
    const { rerender } = render(
      <CustomDocumentModal isOpen {...props} initialValues={{ name: 'Passport' }} />
    );
    rerender(<CustomDocumentModal isOpen={false} {...props} />);
    rerender(
      <CustomDocumentModal
        isOpen
        {...props}
        initialValues={{ name: 'Utility bill', required: true }}
      />
    );
    await waitFor(() => expect(nameField().value).toBe('Utility bill'));
    expect(compulsory().checked).toBe(true);
  });
});

describe('saving a document request', () => {
  it('reports the trimmed name and the compulsory flag', async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: '  Passport  ' } });
    fireEvent.click(compulsory());
    await save();
    expect(onSave).toHaveBeenCalledWith({ name: 'Passport', required: true });
  });

  it('reports an optional document when the box is left alone', async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Passport' } });
    await save();
    expect(onSave).toHaveBeenCalledWith({ name: 'Passport', required: false });
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
    fireEvent.change(nameField(), { target: { value: 'Passport' } });
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
    onSave.mockRejectedValue(new Error('duplicate document'));
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Passport' } });
    await save();
    expect(onClose).not.toHaveBeenCalled();
    expect(nameField().value).toBe('Passport');
  });

  it('holds the save button down while the parent is working', async () => {
    let release;
    onSave.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    renderModal();
    fireEvent.change(nameField(), { target: { value: 'Passport' } });

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
    renderModal({ initialValues: { name: 'Passport', required: true } });
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
