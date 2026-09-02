import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import ErrorBoundary from '../Helper/ErrorBoundary';

/**
 * The top-level crash screen.
 *
 * Testing a class error boundary means letting a child really throw during
 * render, which React always reports to console.error before handing control to
 * the boundary -- so console.error is silenced here rather than asserted on,
 * except where the boundary's own developer logging is the thing under test.
 *
 * The stack-trace panel and that logging are both gated on import.meta.env.DEV,
 * which vitest reports as true; vi.stubEnv stands in for a production build.
 */

// A child that throws on its first render only, so the same tree can be made to
// recover once "Try Again" resets the boundary.
const Boom = ({ shouldThrow = true }) => {
  if (shouldThrow) throw new Error('kaboom');
  return <p>all good</p>;
};

let consoleError;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('a tree that renders cleanly', () => {
  it('shows the children untouched', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

describe('a tree that throws', () => {
  it('replaces the children with the fallback screen', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('logs the error and its component stack in a dev build', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(consoleError).toHaveBeenCalledWith(
      'Error caught by ErrorBoundary:',
      expect.objectContaining({ message: 'kaboom' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('shows the stack trace in a dev build', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
  });

  it('keeps the stack trace off the screen in a production build', () => {
    vi.stubEnv('DEV', false);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalledWith(
      'Error caught by ErrorBoundary:',
      expect.anything(),
      expect.anything()
    );
  });
});

describe('recovering', () => {
  it('re-renders the children when Try Again clears the error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // The child has to stop throwing first; otherwise resetting the boundary
    // just walks straight back into the same crash.
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Try Again'));

    expect(screen.getByText('all good')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('reloads the page from the second button', () => {
    const reload = vi.fn();
    const original = window.location;
    // jsdom's location.reload is not configurable on the object itself, so the
    // whole location has to be swapped out for the click.
    delete window.location;
    window.location = { ...original, reload };

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Reload Page'));
    expect(reload).toHaveBeenCalled();

    window.location = original;
  });
});
