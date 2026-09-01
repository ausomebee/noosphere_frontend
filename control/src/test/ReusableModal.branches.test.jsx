import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ReusableModal from '../Components/ReusableModal/ReusableModal';
import { modalRegistry } from '../hooks/modalRegistry';

/**
 * Branch coverage for ReusableModal.
 *
 * ReusableModal.test.jsx covers the happy paths. This file drives the double-
 * submit guard in all four of its shapes, the focus trap's wrap-around cases,
 * the tab variants, and the button/label fallbacks.
 */

const open = (props = {}) =>
  render(
    <ReusableModal isOpen title="Test modal" onClose={() => {}} {...props}>
      <p>body</p>
    </ReusableModal>
  );

afterEach(() => {
  vi.useRealTimers();
  document.body.style.overflow = '';
  document.body.style.position = '';
});

describe('ReusableModal open/close lifecycle', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <ReusableModal isOpen={false} title="X" onClose={() => {}}>
        <p>hidden</p>
      </ReusableModal>
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
  });

  it('locks body scroll while open and releases it on close', () => {
    const { rerender } = open();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    rerender(
      <ReusableModal isOpen={false} title="Test modal" onClose={() => {}}>
        <p>body</p>
      </ReusableModal>
    );
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.position).toBe('');
  });

  it('registers with the modal registry while open so the board goes inert', () => {
    expect(modalRegistry.getSnapshot()).toBe(0);
    const { unmount } = open();
    expect(modalRegistry.getSnapshot()).toBe(1);
    unmount();
    expect(modalRegistry.getSnapshot()).toBe(0);
  });

  it('does not register while closed', () => {
    render(
      <ReusableModal isOpen={false} title="X" onClose={() => {}}>
        <p>x</p>
      </ReusableModal>
    );
    expect(modalRegistry.getSnapshot()).toBe(0);
  });
});

describe('ReusableModal double-submit guard', () => {
  it('locks the button for a handler that returns nothing to await', () => {
    vi.useFakeTimers();
    const onPrimary = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} onPrimaryButtonClick={onPrimary}>
        <p>body</p>
      </ReusableModal>
    );
    const btn = document.body.querySelector('.primary-button');
    fireEvent.click(btn);
    expect(onPrimary).toHaveBeenCalledTimes(1);
    // Second click while the guard still holds must not reach the handler.
    fireEvent.click(btn);
    expect(onPrimary).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(600);
    });
  });

  it('releases the lock when a promise-returning handler settles', async () => {
    let resolve;
    const onPrimary = vi.fn(() => new Promise((r) => { resolve = r; }));
    open({ onPrimaryButtonClick: onPrimary });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
    );
  });

  it('releases the lock and swallows the rejection when the promise fails', async () => {
    const onPrimary = vi.fn(() => Promise.reject(new Error('server said no')));
    open({ onPrimaryButtonClick: onPrimary });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
    );
  });

  it('releases the lock when the handler throws synchronously', () => {
    // React 19 reports handler errors through its own channel rather than
    // letting them escape fireEvent, so assert on the state the catch branch
    // is there to protect: the button must not be left permanently disabled.
    const onError = vi.spyOn(console, 'error').mockImplementation(() => {});
    // React re-dispatches the handler's error to window; mark it handled so
    // the deliberate throw is not reported as an unhandled error.
    const swallow = (e) => e.preventDefault();
    window.addEventListener('error', swallow);
    const onPrimary = vi.fn(() => {
      throw new Error('boom');
    });
    open({ onPrimaryButtonClick: onPrimary });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    } catch {
      // The rethrow is deliberate; it is not what this test is asserting.
    }
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    window.removeEventListener('error', swallow);
    onError.mockRestore();
  });

  it('falls back to onClose when no primary handler is supplied', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={onClose}>
        <p>body</p>
      </ReusableModal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClose).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
  });

  it('shows the spinner and disables the button while loading', () => {
    open({ primaryButtonLoading: true });
    // The modal is portalled to <body>, and the spinner button has no
    // accessible name, so reach for it in the document by class.
    const spinner = document.body.querySelector('.modal-button-spinner');
    expect(spinner).toBeInTheDocument();
    expect(document.body.querySelector('.primary-button')).toBeDisabled();
  });
});

describe('ReusableModal focus trap', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={onClose}>
        <input aria-label="one" />
      </ReusableModal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('wraps forward from the last focusable to the first', () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} showSecondaryButton={false}>
        <input aria-label="first" />
      </ReusableModal>
    );
    const focusables = document.querySelectorAll(
      '.modal-content button, .modal-content input'
    );
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(focusables[0]);
  });

  it('wraps backward from the first focusable to the last', () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} showSecondaryButton={false}>
        <input aria-label="first" />
      </ReusableModal>
    );
    const focusables = document.querySelectorAll(
      '.modal-content button, .modal-content input'
    );
    focusables[0].focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });

  it('leaves focus alone when Tab is pressed mid-list', () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}}>
        <input aria-label="a" />
        <input aria-label="b" />
      </ReusableModal>
    );
    const middle = screen.getByLabelText('a');
    middle.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(middle);
  });

  it('ignores Tab when the modal holds nothing focusable', () => {
    render(
      <ReusableModal
        isOpen
        title="T"
        onClose={() => {}}
        showPrimaryButton={false}
        showSecondaryButton={false}
      >
        <p>no controls</p>
      </ReusableModal>
    );
    expect(() => fireEvent.keyDown(document, { key: 'Tab' })).not.toThrow();
  });

  it('ignores keys that are neither Escape nor Tab', () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={onClose}>
        <input aria-label="a" />
      </ReusableModal>
    );
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops non-Escape, non-Tab keys from bubbling out of the overlay', () => {
    const onKeyDown = vi.fn();
    const { container } = render(
      <div onKeyDown={onKeyDown}>
        <ReusableModal isOpen title="T" onClose={() => {}}>
          <input aria-label="a" />
        </ReusableModal>
      </div>
    );
    void container;
    fireEvent.keyDown(screen.getByLabelText('a'), { key: ' ' });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('lets Escape bubble through the overlay to the document handler', () => {
    const onKeyDown = vi.fn();
    render(
      <div onKeyDown={onKeyDown}>
        <ReusableModal isOpen title="T" onClose={() => {}}>
          <input aria-label="a" />
        </ReusableModal>
      </div>
    );
    fireEvent.keyDown(screen.getByLabelText('a'), { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalled();
  });
});

describe('ReusableModal tabs', () => {
  const tabs = [
    { name: 'One', content: <p>first pane</p> },
    { name: 'Two', content: <p>second pane</p> },
  ];

  it('renders the active tab content instead of children', () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={tabs} activeTab="One" onTabChange={() => {}}>
        <p>children ignored</p>
      </ReusableModal>
    );
    expect(screen.getByText('first pane')).toBeInTheDocument();
    expect(screen.queryByText('children ignored')).not.toBeInTheDocument();
  });

  it('marks only the active tab', () => {
    const { container } = render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={tabs} activeTab="Two" onTabChange={() => {}}>
        <p>x</p>
      </ReusableModal>
    );
    const buttons = container.querySelectorAll('.tab-button');
    void buttons;
    expect(screen.getByText('Two').className).toContain('active-tab');
    expect(screen.getByText('One').className).not.toContain('active-tab');
  });

  it('reports tab changes', () => {
    const onTabChange = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={tabs} activeTab="One" onTabChange={onTabChange}>
        <p>x</p>
      </ReusableModal>
    );
    fireEvent.click(screen.getByText('Two'));
    expect(onTabChange).toHaveBeenCalledWith('Two');
  });

  it('renders children when the tabs array is empty', () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={[]}>
        <p>children shown</p>
      </ReusableModal>
    );
    expect(screen.getByText('children shown')).toBeInTheDocument();
  });

  it('renders an empty body when the active tab matches nothing', () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={tabs} activeTab="Missing" onTabChange={() => {}}>
        <p>x</p>
      </ReusableModal>
    );
    expect(screen.queryByText('first pane')).not.toBeInTheDocument();
    expect(screen.queryByText('second pane')).not.toBeInTheDocument();
  });
});

describe('ReusableModal footer', () => {
  it('uses the default button labels and colours', () => {
    open();
    const primary = screen.getByRole('button', { name: 'Save' });
    const secondary = screen.getByRole('button', { name: 'Cancel' });
    expect(primary).toHaveStyle({ backgroundColor: '#000000' });
    expect(secondary).toHaveStyle({ backgroundColor: '#ffffff' });
  });

  it('honours custom labels and colours', () => {
    open({
      primaryButtonText: 'Publish',
      secondaryButtonText: 'Discard',
      primaryButtonColor: '#123456',
      secondaryButtonColor: '#abcdef',
    });
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveStyle({
      backgroundColor: '#123456',
    });
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveStyle({
      backgroundColor: '#abcdef',
    });
  });

  it('hides the primary button when asked', () => {
    open({ showPrimaryButton: false });
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('hides the secondary button when asked', () => {
    open({ showSecondaryButton: false });
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('falls back to onClose for the secondary button', () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={onClose}>
        <p>body</p>
      </ReusableModal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies a custom footer class', () => {
    const { container } = open({ footerClassName: 'stacked' });
    expect(container.ownerDocument.querySelector('.modal-buttons')).toHaveClass('stacked');
  });
});
