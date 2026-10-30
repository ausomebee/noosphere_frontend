import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import DeleteConfirmationModal from '../Components/ReusableModal/DeleteConfirmationModal';

/**
 * The plain "are you sure?" confirmation.
 *
 * It owns no state -- it is a fixed body (icon, title, message) plus a mapping
 * from its own props onto ReusableModal's. The only logic worth pinning is the
 * footer class, which centres a lone button: showing exactly one of the two
 * buttons adds `center-footer`, showing both or neither does not.
 */

const onClose = vi.fn();
const onConfirm = vi.fn();

const renderModal = (props = {}) =>
  render(
    <DeleteConfirmationModal
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete this plan?"
      message="This cannot be undone."
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');
const footer = () => document.body.querySelector('.modal-buttons');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('what it shows', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Delete this plan?')).not.toBeInTheDocument();
  });

  it('shows the question and the warning under it', () => {
    renderModal();
    expect(screen.getByText('Delete this plan?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('draws its own alert icon when the caller supplies none', () => {
    renderModal();
    expect(document.body.querySelector('.warning-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
  });

  it('draws the caller icon in place of its own', () => {
    const Icon = (props) => <svg data-testid="custom-icon" {...props} />;
    renderModal({ icon: Icon });
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('uses the caller wording and colour for the confirm button', () => {
    renderModal({ confirmButtonText: 'Delete plan', confirmButtonColor: '#b42318' });
    expect(primary().textContent).toBe('Delete plan');
    expect(primary()).toHaveStyle({ backgroundColor: '#b42318' });
  });

  it('falls back to Save and black when the caller names neither', () => {
    renderModal();
    expect(primary().textContent).toBe('Save');
    expect(primary()).toHaveStyle({ backgroundColor: '#000000' });
  });
});

describe('its footer', () => {
  it('shows both buttons uncentred by default', () => {
    renderModal();
    expect(primary()).toBeInTheDocument();
    expect(secondary()).toBeInTheDocument();
    expect(footer().className).not.toContain('center-footer');
  });

  it('centres a lone confirm button', () => {
    renderModal({ showSecondaryButton: false });
    expect(secondary()).not.toBeInTheDocument();
    expect(footer().className).toContain('center-footer');
  });

  it('centres a lone cancel button', () => {
    renderModal({ showConfirmButton: false });
    expect(primary()).not.toBeInTheDocument();
    expect(footer().className).toContain('center-footer');
  });

  it('leaves an empty footer uncentred', () => {
    renderModal({ showConfirmButton: false, showSecondaryButton: false });
    expect(footer().className).not.toContain('center-footer');
    expect(footer().children).toHaveLength(0);
  });

  it('locks the confirm button while the delete is in flight', () => {
    renderModal({ confirmButtonLoading: true });
    expect(primary()).toBeDisabled();
  });
});

describe('answering it', () => {
  it('confirms', () => {
    renderModal();
    fireEvent.click(primary());
    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels', () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores a click on a confirm button held for a delete already running', () => {
    renderModal({ confirmButtonLoading: true });
    fireEvent.click(primary());
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
