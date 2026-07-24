import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormLibraryModal from '../Components/ReusableModal/ClientModal/FormLibraryModal';

describe('FormLibraryModal', () => {
  const mockForms = [
    { id: '1', name: 'Intake Form' },
    { id: '2', name: 'Consent Form' },
    { id: '3', name: 'Assessment Form' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectForm: vi.fn(),
    forms: mockForms,
    loading: false,
  };

  it('renders form list when open', () => {
    render(<FormLibraryModal {...defaultProps} />);
    expect(screen.getByText('Intake Form')).toBeInTheDocument();
    expect(screen.getByText('Consent Form')).toBeInTheDocument();
    expect(screen.getByText('Assessment Form')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<FormLibraryModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Intake Form')).not.toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<FormLibraryModal {...defaultProps} loading={true} forms={[]} />);
    // Loading is now the standardized borderless spinner (role="status"), not inline text.
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state when no forms', () => {
    render(<FormLibraryModal {...defaultProps} forms={[]} />);
    expect(screen.getByText('No forms in library')).toBeInTheDocument();
  });

  it('filters forms by search term', () => {
    render(<FormLibraryModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Type to search...');
    fireEvent.change(searchInput, { target: { value: 'Intake' } });
    expect(screen.getByText('Intake Form')).toBeInTheDocument();
    expect(screen.queryByText('Consent Form')).not.toBeInTheDocument();
  });

  it('shows no results when search has no matches', () => {
    render(<FormLibraryModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Type to search...');
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } });
    expect(screen.getByText('No forms match your search')).toBeInTheDocument();
  });

  it('renders Use Form button for each form', () => {
    render(<FormLibraryModal {...defaultProps} />);
    const buttons = screen.getAllByText('Use Form');
    expect(buttons).toHaveLength(3);
  });

  it('renders modal title', () => {
    render(<FormLibraryModal {...defaultProps} />);
    expect(screen.getByText('Import from Form Library')).toBeInTheDocument();
  });
});
