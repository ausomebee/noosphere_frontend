import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from '../Components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders inline spinner by default (not full page)', () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.firstChild;
    expect(wrapper).not.toHaveClass('h-100vh');
    expect(wrapper).toHaveClass('min-h-[200px]');
  });

  it('renders full page spinner when fullPage is true', () => {
    const { container } = render(<LoadingSpinner fullPage />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('h-100vh');
  });

  it('renders the spinner icon', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });
});
