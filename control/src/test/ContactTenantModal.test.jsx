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

import ContactTenantModal from '../Components/ReusableModal/IssueViewModals/ContactTenantModal';

/**
 * The modal that emails the tenant behind an issue.
 *
 * A subject line and a body are both required and both length-capped by a yup
 * schema, so a bad submit never reaches the save handler -- it goes to
 * `showValidationErrors` instead and the modal stays open.
 *
 * The attachment picker is a simulated upload driven by a `setInterval` that
 * steps the progress bar to 100 over ten 300ms ticks; only a file that finished
 * and is not marked failed ends up on the payload. A file can fail on size
 * before it starts, or (by a name convention baked into the component) at the
 * very end, and both are exercised here under fake timers.
 *
 * Both fields share a placeholder, so they are told apart by order: the subject
 * is the input and the body is the textarea.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <ContactTenantModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      issueId="i1"
      accessToken="at"
      refreshToken="rt"
      {...props}
    />
  );

const primary = () => document.body.querySelector('.primary-button');
const headerField = () => screen.getAllByPlaceholderText('Type something')[0];
const bodyField = () => screen.getAllByPlaceholderText('Type something')[1];
const uploadInput = () => document.body.querySelector('.upload-input');

// jsdom derives a File's size from its parts, so an oversized fixture is faked
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

const fillValid = (header = 'Scheduled maintenance', body = 'We will restart at 2am.') => {
  fireEvent.change(headerField(), { target: { value: header } });
  fireEvent.change(bodyField(), { target: { value: body } });
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

describe('the email form', () => {
  it('renders nothing at all while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Contact tenant by email')).not.toBeInTheDocument();
  });

  it('opens on two empty fields and no file list', () => {
    renderModal();
    expect(screen.getByText('Contact tenant by email')).toBeInTheDocument();
    expect(headerField()).toHaveValue('');
    expect(bodyField()).toHaveValue('');
    expect(document.body.querySelector('.file-list')).toBeNull();
  });

  it('sends the subject and body with no attachment', async () => {
    renderModal();
    fillValid();
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      header: 'Scheduled maintenance',
      body: 'We will restart at 2am.',
      attachmentFile: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('trims both fields before sending them', async () => {
    renderModal();
    fillValid('  Subject  ', '  Body  ');
    await submit();
    expect(onSave).toHaveBeenCalledWith({
      header: 'Subject',
      body: 'Body',
      attachmentFile: null,
    });
  });

  it('clears the form after a successful send', async () => {
    renderModal();
    fillValid();
    await submit();
    expect(headerField()).toHaveValue('');
    expect(bodyField()).toHaveValue('');
  });
});

describe('validation', () => {
  it('refuses an empty form and reports both failures', async () => {
    renderModal();
    await submit();

    expect(onSave).not.toHaveBeenCalled();
    const errors = showValidationErrors.mock.calls[0][0];
    expect(errors.header.message).toBe('Header is required');
    expect(errors.body.message).toBe('Body is required');
  });

  it('refuses a subject that is only whitespace', async () => {
    renderModal();
    fillValid('   ', 'We will restart at 2am.');
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Header is required')).toBeInTheDocument();
  });

  it('refuses a body that is only whitespace', async () => {
    renderModal();
    fillValid('Scheduled maintenance', '   ');
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Body is required')).toBeInTheDocument();
  });

  it('caps the subject at a hundred characters', async () => {
    renderModal();
    fillValid('x'.repeat(101));
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Header must not exceed 100 characters')).toBeInTheDocument();
  });

  it('caps the body at a thousand characters', async () => {
    renderModal();
    fillValid('Scheduled maintenance', 'x'.repeat(1001));
    await submit();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Body must not exceed 1000 characters')).toBeInTheDocument();
  });
});

describe('the attachment', () => {
  it('lists a file it accepted and sizes it in kilobytes', () => {
    renderModal();
    attach(makeFile('notes.png', 400 * 1024));
    expect(screen.getByText('notes.png (400 KB)')).toBeInTheDocument();
    expect(document.body.querySelector('.progress-bar')).toBeInTheDocument();
  });

  it('sizes a larger file in megabytes', () => {
    renderModal();
    attach(makeFile('dump.png', 2.5 * 1024 * 1024));
    expect(screen.getByText('dump.png (2.5 MB)')).toBeInTheDocument();
  });

  it('walks the progress bar to full and attaches the file', async () => {
    const file = makeFile('notes.png');
    renderModal();
    attach(file);
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '0%' });

    finishUpload();
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '100%' });

    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBe(file);
  });

  it('rejects a file over the fifty megabyte limit before uploading it', async () => {
    renderModal();
    attach(makeFile('huge.png', 60 * 1024 * 1024));
    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
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

    fillValid();
    await submit();
    expect(onSave.mock.calls[0][0].attachmentFile).toBe(good);
  });

  it('forgets the files it had after a successful send', async () => {
    renderModal();
    attach(makeFile('notes.png'));
    finishUpload();
    fillValid();
    await submit();
    expect(document.body.querySelector('.file-list')).toBeNull();
  });
});

describe('when the send is refused', () => {
  it('reports the failure and leaves the modal open with its text intact', async () => {
    const failure = new Error('tenant has no email on file');
    onSave.mockRejectedValue(failure);
    renderModal();
    fillValid();
    await submit();

    expect(showApiError).toHaveBeenCalledWith(failure, 'CONTACT_TENANT');
    expect(onClose).not.toHaveBeenCalled();
    expect(headerField()).toHaveValue('Scheduled maintenance');
  });

  it('re-enables the send button so the admin can retry', async () => {
    onSave.mockRejectedValueOnce(new Error('nope'));
    renderModal();
    fillValid();
    await submit();
    expect(primary()).not.toBeDisabled();

    await submit();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalled();
  });

  it('locks the button while the send is in flight', async () => {
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

describe('abandoning the email', () => {
  it('closes on Cancel without sending anything', () => {
    renderModal();
    fillValid();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes on Escape, discarding the files that were picked', () => {
    renderModal();
    attach(makeFile('notes.png'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('two attachments at once', () => {
  it('marks only the file that failed and leaves its neighbour alone', () => {
    renderModal();
    attach(makeFile('Unable-to-read.png'), makeFile('notes.png', 400 * 1024));
    finishUpload();
    expect(screen.getAllByText('Unable to upload. Please try again')).toHaveLength(1);
    expect(screen.getByText('notes.png (400 KB)')).toBeInTheDocument();
  });
});
