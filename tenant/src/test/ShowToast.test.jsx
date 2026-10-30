import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'react-toastify';
import { showToast } from '../Helper/ShowToast';

vi.mock('react-toastify', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    isActive: vi.fn(() => false),
  }),
}));

describe('showToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toast.isActive.mockReturnValue(false);
  });

  it('calls toast.success for success type', () => {
    showToast('Saved!', 'success');
    expect(toast.success).toHaveBeenCalledWith('Saved!', expect.any(Object));
  });

  it('calls toast.error for error type', () => {
    showToast('Failed!', 'error');
    expect(toast.error).toHaveBeenCalledWith('Failed!', expect.any(Object));
  });

  it('calls default toast for unknown type', () => {
    showToast('Info message', 'info');
    expect(toast).toHaveBeenCalledWith('Info message', expect.any(Object));
  });

  it('calls default toast when no type provided', () => {
    showToast('Hello');
    expect(toast).toHaveBeenCalledWith('Hello', expect.any(Object));
  });

  it('handles object-style argument { message, type }', () => {
    showToast({ message: 'Done!', type: 'success' });
    expect(toast.success).toHaveBeenCalledWith('Done!', expect.any(Object));
  });

  it('handles object with only message', () => {
    showToast({ message: 'Just a note' });
    expect(toast).toHaveBeenCalledWith('Just a note', expect.any(Object));
  });

  it('handles null/undefined message gracefully', () => {
    showToast(null);
    expect(toast).toHaveBeenCalledWith('', expect.any(Object));
  });

  it('handles empty string', () => {
    showToast('', 'success');
    expect(toast.success).toHaveBeenCalledWith('', expect.any(Object));
  });

  it('passes position top-center in options', () => {
    showToast('Test', 'success');
    const options = toast.success.mock.calls[0][1];
    expect(options.position).toBe('top-center');
  });

  it('passes toastId to prevent duplicates', () => {
    showToast('Saved!', 'success');
    const options = toast.success.mock.calls[0][1];
    expect(options.toastId).toBe('success-Saved!');
  });

  it('skips toast if same one is already active', () => {
    toast.isActive.mockReturnValue(true);
    showToast('Saved!', 'success');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows toast if different message is active', () => {
    toast.isActive.mockImplementation((id) => id === 'success-Other');
    showToast('Saved!', 'success');
    expect(toast.success).toHaveBeenCalled();
  });
});
