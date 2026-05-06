import { describe, it, expect, vi } from 'vitest';
import { toast } from 'react-toastify';
import { showToast } from '../Helper/ShowToast';

vi.mock('react-toastify', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe('showToast', () => {
  it('calls toast.success for "success" type', () => {
    showToast('Plan created', 'success');
    expect(toast.success).toHaveBeenCalledWith(
      'Plan created',
      expect.objectContaining({ position: 'top-center' })
    );
  });

  it('calls toast.error for "error" type', () => {
    showToast('Something failed', 'error');
    expect(toast.error).toHaveBeenCalledWith(
      'Something failed',
      expect.objectContaining({ position: 'top-center' })
    );
  });

  it('calls default toast for unknown type', () => {
    showToast('Info message');
    expect(toast).toHaveBeenCalledWith(
      'Info message',
      expect.objectContaining({ position: 'top-center' })
    );
  });

  it('uses black background for success', () => {
    showToast('OK', 'success');
    const opts = toast.success.mock.calls[toast.success.mock.calls.length - 1][1];
    expect(opts.style.background).toBe('#000000');
    expect(opts.style.color).toBe('#ffffff');
  });

  it('uses black background for error', () => {
    showToast('Err', 'error');
    const opts = toast.error.mock.calls[toast.error.mock.calls.length - 1][1];
    expect(opts.style.background).toBe('#000000');
  });
});
