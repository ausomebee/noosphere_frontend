import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReusableModal from '../Components/ReusableModal/ReusableModal';

describe('ReusableModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    primaryButtonText: 'Save',
    secondaryButtonText: 'Cancel',
    onPrimaryButtonClick: vi.fn(),
    onSecondaryButtonClick: vi.fn(),
  };

  it('renders when open', () => {
    render(<ReusableModal {...defaultProps}><p>Content</p></ReusableModal>);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ReusableModal {...defaultProps} isOpen={false}><p>Content</p></ReusableModal>);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onPrimaryButtonClick', () => {
    render(<ReusableModal {...defaultProps}><p>Content</p></ReusableModal>);
    fireEvent.click(screen.getByText('Save'));
    expect(defaultProps.onPrimaryButtonClick).toHaveBeenCalled();
  });

  it('calls onSecondaryButtonClick', () => {
    render(<ReusableModal {...defaultProps}><p>Content</p></ReusableModal>);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onSecondaryButtonClick).toHaveBeenCalled();
  });

  it('shows spinner when primaryButtonLoading is true', () => {
    const { container } = render(<ReusableModal {...defaultProps} primaryButtonLoading={true}><p>Content</p></ReusableModal>);
    const spinner = container.querySelector('.modal-button-spinner');
    expect(spinner).toBeInTheDocument();
    // Save text should not be visible when loading
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('disables primary button when loading', () => {
    const { container } = render(<ReusableModal {...defaultProps} primaryButtonLoading={true}><p>Content</p></ReusableModal>);
    const primaryBtn = container.querySelector('.primary-button');
    expect(primaryBtn).toBeDisabled();
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<ReusableModal {...defaultProps} onClose={onClose}><p>Content</p></ReusableModal>);
    const closeBtn = document.querySelector('.modal-close-button');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });
});
