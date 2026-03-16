import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

  it('renders nothing when closed', () => {
    render(<ReusableModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders title when open', () => {
    render(<ReusableModal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('renders primary and secondary buttons', () => {
    render(<ReusableModal {...defaultProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onSecondaryButtonClick when cancel is clicked', () => {
    render(<ReusableModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onSecondaryButtonClick).toHaveBeenCalled();
  });

  it('disables primary button when loading', () => {
    render(<ReusableModal {...defaultProps} primaryButtonLoading={true} />);
    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn).toBeDisabled();
  });

  it('shows spinner instead of text when loading', () => {
    render(<ReusableModal {...defaultProps} primaryButtonLoading={true} />);
    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn.querySelector('.modal-btn-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ReusableModal {...defaultProps}>
        <p>Modal content here</p>
      </ReusableModal>
    );
    expect(screen.getByText('Modal content here')).toBeInTheDocument();
  });
});
