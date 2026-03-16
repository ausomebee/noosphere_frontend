import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DeleteConfirmationModal from '../Components/ReusableModal/PipelineModal/DeleteConfirmationModal';

describe('DeleteConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Item',
    message: 'Are you sure you want to delete this?',
    confirmButtonText: 'Delete',
    confirmButtonColor: '#D92D20',
  };

  it('renders nothing when closed', () => {
    render(<DeleteConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    render(<DeleteConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<DeleteConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<DeleteConfirmationModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders confirmation content container', () => {
    render(<DeleteConfirmationModal {...defaultProps} />);
    // Portal renders to document.body
    expect(document.querySelector('.delete-confirmation-content')).toBeInTheDocument();
  });

  it('disables confirm button when loading', () => {
    render(<DeleteConfirmationModal {...defaultProps} loading={true} />);
    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<DeleteConfirmationModal {...defaultProps} loading={true} />);
    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn.querySelector('.modal-btn-spinner')).toBeInTheDocument();
  });
});
