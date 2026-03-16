import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../Components/Table/Pagination';

describe('Pagination', () => {
  it('renders Previous and Next buttons', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('disables Previous on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('Previous').closest('button')).toBeDisabled();
  });

  it('disables Next on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('Next').closest('button')).toBeDisabled();
  });

  it('enables both buttons on middle page', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('Previous').closest('button')).not.toBeDisabled();
    expect(screen.getByText('Next').closest('button')).not.toBeDisabled();
  });

  it('calls onPageChange with next page when Next clicked', () => {
    const handleChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByText('Next').closest('button'));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with previous page when Previous clicked', () => {
    const handleChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByText('Previous').closest('button'));
    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when page number is clicked', () => {
    const handleChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={handleChange} />);
    fireEvent.click(screen.getByText('3'));
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('highlights current page as active', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('3').closest('button')).toHaveClass('active');
  });

  it('does not highlight non-active pages', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByText('2').closest('button')).not.toHaveClass('active');
  });

  it('shows ellipsis for many pages', () => {
    render(<Pagination currentPage={5} totalPages={20} onPageChange={vi.fn()} />);
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('renders single page without ellipsis', () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });
});
