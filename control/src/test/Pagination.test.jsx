import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../Components/Table/Pagination';

describe('Pagination', () => {
  it('renders page numbers', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    );
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
    }
  });

  it('previous button is disabled on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    );
    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  it('next button is disabled on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />
    );
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when clicking a page number', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange on previous click', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange on next click', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('renders ellipsis for many pages', () => {
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />
    );
    const ellipses = document.querySelectorAll('.pagination-ellipsis');
    expect(ellipses.length).toBeGreaterThan(0);
  });
});
