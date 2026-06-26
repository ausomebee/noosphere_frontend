import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from '../Helper/ErrorBoundary';

// Component that throws
const ThrowingComponent = () => {
  throw new Error('Test crash');
};

// Suppress console.error for expected errors in tests
const originalError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('offers Try Again and Reload Page buttons in the fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Try Again').tagName).toBe('BUTTON');
    expect(screen.getByText('Reload Page').tagName).toBe('BUTTON');
  });
});
