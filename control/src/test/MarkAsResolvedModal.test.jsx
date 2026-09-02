import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { showApiError, showValidationErrors } = vi.hoisted(() => ({
  showApiError: vi.fn(),
  showValidationErrors: vi.fn(),
}));

vi.mock('../Helper/ShowToast', () => ({ showApiError, showToast: vi.fn() }));
// The validation-failure handler lives in formErrors, not in ShowToast.
vi.mock('../Helper/formErrors', () => ({
  showValidationErrors,
  default: showValidationErrors,
}));

import MarkAsResolvedModal from '../Components/ReusableModal/IssueViewModals/MarkAsResolvedModal';

/**
 * The modal that closes out an issue.
 *
 * Two things have to be true before it will submit: a resolution description
 * and an explicit confirmation that the tenant agrees the issue is resolved.
 * Both are enforced by a yup schema, so a failed submit never reaches the
 * handler at all -- it lands in `showValidationErrors` instead.
 *
 * The attachment picker is a simulated upload: a `setInterval` walks the
 * progress bar to 100 in ten 300ms steps, and only a file that finished and is
 * not marked failed is attached to the payload. Files can fail two ways, on
 * size before the upload starts and (by a name convention baked into the
 * component) at the end of it, and both are exercised here with fake timers.
 *
 * ReusableModal ignores `primaryButtonDisabled`, so the guards inside the
 * handlers are what actually hold a submit back; the submit is async, which is
 * why every click is flushed with an async `act`.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <MarkAsResolvedModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      issueId="i1"
      adminId="a1"
      accessToken="at"
      refreshToken="rt"
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const resolutionField = () => screen.getByPlaceholderText('Enter resolution details');
const approvalSwitch = () => document.body.querySelector('input[type="checkbox"]');
const uploadInput = () => document.body.querySelector('.upload-input');

// jsdom builds a File's size from its parts, so an oversized fixture is faked
// rather than actually allocated.
const makeFile = (name, size = 2048) => {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
};

const attach = (...files) => {
  Object.defineProperty(uploadInput(), 'files', { value: files, configurable: true });
  fireEvent.change(uploadInput());
};

// Ten 300ms ticks take the simulated upload from 0 to 100.
const finishUpload = () => act(() => { vi.advanceTimersByTime(3000); });

const fillValid = (resolution = 'Restarted the worker') => {
  fireEvent.change(resolutionField(), { target: { value: resolution } });
  fireEvent.click(approvalSwitch());
};

const submit = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the form', () => {
  it('renders nothing at all while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Mark as Resolved')).not.toBeInTheDocument();
  });

  it('opens on an empty resolution with no files listed', () => {
    renderModal();
    expect(screen.getByText('Mark as Resolved')).toBeInTheDocument();
    expect(resolutionField()).toHaveValue('');
    expect(document.body.querySelector('.file-list')).toBeNull();
  });

  it('saves the resolution once both requirements are met', async () => {
    renderModal();
    fillValid();
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      resolution: 'Restarted the worker',
      attachmentFile: null,
    });
    expect(onClose).toHaveBeenCalled();
    expect(showValidationErrors).not.toHaveBeenCalled();
  });

  it('trims the resolution before sending it', async () => {
    renderModal();
    fillValid('   Restarted the worker   ');
    await submit();
    expect(onSave.mock.calls[0][0].resolution).toBe('Restarted the worker');
  });

  it('clears the form after a successful save', async () => {
    renderModal();
    fillValid();
    await submit();
    expect(resolutionField()).toHaveValue('');
    expect(approvalSwitch()).not.toBeChecked();
  });
});

describe('validation', () => {
  it('refuses an empty form and reports both failures', async () => {
    renderModal();
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    expect(showValidationErrors).toHaveBeenCalledTimes(1);
    const errors = showValidationErrors.mock.calls[0][0];
    expect(errors.resolution.message).toBe('Resolution description is required');
    expect(errors.tenantApproval.message).toContain('You must confirm with the tenant');
  });

  it('refuses a resolution that is only whitespace', async () => {
    renderModal();
    fireEvent.change(resolutionField(), { target: { value: '    ' } });
    fireEvent.click(approvalSwitch());
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Resolution description is required')).toBeInTheDocument();
  });

  it('refuses a resolution longer than a thousand characters', async () => {
    renderModal();
    fillValid('x'.repeat(1001));
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText('Resolution must not exceed 1000 characters')
    ).toBeInTheDocument();
  });

  it('refuses to resolve without the tenant confirmation, and says so inline', async () => {
    renderModal();
    fireEvent.change(resolutionField(), { target: { value: 'Restarted the worker' } });
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    // The switch error is echoed under the form as well as through the toast.
    expect(
      screen.getByText(
        'You must confirm with the tenant that the issue is resolved before proceeding.'
      )
    ).toBeInTheDocument();
  });
});

describe('the attachment', () => {
  it('shows a file it accepted and sizes it in kilobytes', () => {
    renderModal();
    attach(makeFile('trace.png', 512 * 1024));
    expect(screen.getByText('trace.png (512 KB)')).toBeInTheDocument();
    expect(document.body.querySelector('.progress-bar')).toBeInTheDocument();
  });

  it('sizes a larger file in megabytes', () => {
    renderModal();
    attach(makeFile('dump.png', 3.5 * 1024 * 1024));
    expect(screen.getByText('dump.png (3.5 MB)')).toBeInTheDocument();
  });

  it('walks the progress bar to full', () => {
    renderModal();
    attach(makeFile('trace.png'));
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '0%' });
    finishUpload();
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '100%' });
  });

  it('attaches the finished file to the payload', async () => {
    const file = makeFile('trace.png');
    renderModal();
    attach(file);
    finishUpload();
    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBe(file);
  });

  it('rejects a file over the fifty megabyte limit before uploading it', async () => {
    renderModal();
    attach(makeFile('huge.png', 60 * 1024 * 1024));
    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
    // A rejected file never gets a progress bar, and never gets attached.
    expect(document.body.querySelector('.progress-bar')).toBeNull();

    finishUpload();
    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBeNull();
  });

  it('marks a file that failed at the end of its upload', async () => {
    renderModal();
    attach(makeFile('Unable-to-read.png'));
    finishUpload();
    expect(screen.getByText('Unable to upload. Please try again')).toBeInTheDocument();

    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBeNull();
  });

  it('will not attach a file whose upload has not finished', async () => {
    renderModal();
    attach(makeFile('slow.png'));
    act(() => { vi.advanceTimersByTime(300); });
    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBeNull();
  });

  it('takes several files at once and attaches the first that finished', async () => {
    const good = makeFile('good.png');
    renderModal();
    attach(makeFile('huge.png', 60 * 1024 * 1024), good);
    finishUpload();

    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBe(good);
  });

  it('forgets the files it had after a successful save', async () => {
    renderModal();
    attach(makeFile('trace.png'));
    finishUpload();
    fillValid();
    await submit();
    expect(document.body.querySelector('.file-list')).toBeNull();
  });
});

describe('when the save is refused', () => {
  it('reports the failure and leaves the modal open', async () => {
    const failure = new Error('issue already closed');
    onSave.mockRejectedValue(failure);
    renderModal();
    fillValid();
    await submit();

    expect(showApiError).toHaveBeenCalledWith(failure, 'RESOLVE_ISSUE');
    expect(onClose).not.toHaveBeenCalled();
    // Nothing was cleared, so the admin can correct and retry.
    expect(resolutionField()).toHaveValue('Restarted the worker');
  });

  it('re-enables the save button so the admin can retry', async () => {
    onSave.mockRejectedValueOnce(new Error('nope'));
    renderModal();
    fillValid();
    await submit();
    expect(primary()).not.toBeDisabled();

    await submit();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalled();
  });

  it('locks the button while the save is in flight', async () => {
    let release;
    onSave.mockReturnValue(new Promise((r) => { release = r; }));
    renderModal();
    fillValid();
    await submit();

    expect(primary()).toBeDisabled();
    expect(document.body.querySelector('.modal-button-spinner')).toBeInTheDocument();
    await act(async () => { release(); });
  });
});

describe('abandoning the form', () => {
  it('closes on Cancel', () => {
    renderModal();
    fillValid();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes on Escape, discarding the files that were picked', () => {
    renderModal();
    attach(makeFile('trace.png'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('two attachments at once', () => {
  it('marks only the file that failed and leaves its neighbour alone', () => {
    renderModal();
    attach(makeFile('Unable-to-read.png'), makeFile('trace.png', 512 * 1024));
    finishUpload();
    expect(screen.getAllByText('Unable to upload. Please try again')).toHaveLength(1);
    expect(screen.getByText('trace.png (512 KB)')).toBeInTheDocument();
  });
});
