import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSpinner, {
  Skeleton,
  SkeletonText,
  SkeletonTable,
} from '../Components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders full-page spinner', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading-spinner-container')).toBeInTheDocument();
    expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('.skeleton-shimmer');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ width: '80px', height: '16px' });
  });

  it('renders with custom dimensions', () => {
    const { container } = render(<Skeleton width="200px" height="40px" borderRadius="8px" />);
    const el = container.querySelector('.skeleton-shimmer');
    expect(el).toHaveStyle({ width: '200px', height: '40px', borderRadius: '8px' });
  });

  it('applies custom style', () => {
    const { container } = render(<Skeleton style={{ marginTop: '10px' }} />);
    const el = container.querySelector('.skeleton-shimmer');
    expect(el).toHaveStyle({ marginTop: '10px' });
  });
});

describe('SkeletonText', () => {
  it('renders single line by default', () => {
    const { container } = render(<SkeletonText />);
    const shimmers = container.querySelectorAll('.skeleton-shimmer');
    expect(shimmers).toHaveLength(1);
  });

  it('renders multiple lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const shimmers = container.querySelectorAll('.skeleton-shimmer');
    expect(shimmers).toHaveLength(3);
  });

  it('last line is shorter when multiple lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const shimmers = container.querySelectorAll('.skeleton-shimmer');
    expect(shimmers[2]).toHaveStyle({ width: '60%' });
  });
});

describe('SkeletonTable', () => {
  it('renders correct number of rows and columns', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />);
    const header = container.querySelector('.skeleton-table-header');
    const rows = container.querySelectorAll('.skeleton-table-row');
    expect(header.querySelectorAll('.skeleton-shimmer')).toHaveLength(4);
    expect(rows).toHaveLength(3);
    expect(rows[0].querySelectorAll('.skeleton-shimmer')).toHaveLength(4);
  });

  it('uses default rows and cols', () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll('.skeleton-table-row');
    expect(rows).toHaveLength(5); // default 5 rows
  });
});
