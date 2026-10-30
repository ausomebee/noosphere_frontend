import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProgramLibraryModal from '../Components/ReusableModal/ClientModal/ProgramLibraryModal';

describe('ProgramLibraryModal', () => {
  const mockPrograms = [
    { id: '1', name: 'ABA Program', description: 'Applied behavior' },
    { id: '2', name: 'Speech Therapy', description: 'Language development' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectProgram: vi.fn(),
    programs: mockPrograms,
    loading: false,
  };

  it('renders program list', () => {
    render(<ProgramLibraryModal {...defaultProps} />);
    expect(screen.getByText('ABA Program')).toBeInTheDocument();
    expect(screen.getByText('Speech Therapy')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ProgramLibraryModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('ABA Program')).not.toBeInTheDocument();
  });

  it('shows loading when loading', () => {
    render(<ProgramLibraryModal {...defaultProps} loading={true} programs={[]} />);
    expect(screen.getByText('Loading programs...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ProgramLibraryModal {...defaultProps} programs={[]} />);
    expect(screen.getByText('No programs in library')).toBeInTheDocument();
  });

  it('filters by search', () => {
    render(<ProgramLibraryModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Type to search...'), { target: { value: 'ABA' } });
    expect(screen.getByText('ABA Program')).toBeInTheDocument();
    expect(screen.queryByText('Speech Therapy')).not.toBeInTheDocument();
  });

  it('renders Use Program buttons', () => {
    render(<ProgramLibraryModal {...defaultProps} />);
    expect(screen.getAllByText('Use Program')).toHaveLength(2);
  });

  it('renders modal title', () => {
    render(<ProgramLibraryModal {...defaultProps} />);
    expect(screen.getByText('Import from Program Library')).toBeInTheDocument();
  });
});
