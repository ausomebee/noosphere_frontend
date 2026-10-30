import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import AddAttachmentModal from '../Components/ReusableModal/IssueViewModals/AddAttachmentModal';

/**
 * The attachment-only modal on an issue.
 *
 * It has no form: the whole subject is the simulated upload. Picking a file
 * starts a `setInterval` that steps a progress bar to 100 over ten 300ms ticks,
 * and only a file that reached 100 without being marked failed can be saved. A
 * file fails either immediately on size, or -- by a name convention baked into
 * the component -- at the very end of its upload.
 *
 * `handleSave` guards on there being such a file, and ReusableModal ignores
 * `primaryButtonDisabled`, so clicking Save early is a real no-op rather than a
 * click on a dead button; that is what the guard tests here actually assert.
 *
 * Unlike its siblings this modal swallows a rejected save entirely and leaves
 * itself open for the parent to explain.
 */

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = (props = {}) =>
  render(
    <AddAttachmentModal
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

const save = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
  // A no-op save returns nothing, and the modal then holds its button for
  // 600ms; letting that expire keeps a second click in the same test live.
  act(() => { vi.advanceTimersByTime(700); });
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

describe('the picker', () => {
  it('renders nothing at all while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Add an attachment')).not.toBeInTheDocument();
  });

  it('opens with no file listed', () => {
    renderModal();
    expect(screen.getByText('Add an attachment')).toBeInTheDocument();
    expect(document.body.querySelector('.file-list')).toBeNull();
  });

  it('accepts only the image types the issue view supports', () => {
    renderModal();
    expect(uploadInput()).toHaveAttribute(
      'accept',
      'image/svg+xml,image/png,image/jpeg,image/gif'
    );
  });

  it('lists a picked file and sizes it in kilobytes', () => {
    renderModal();
    attach(makeFile('screenshot.png', 300 * 1024));
    expect(screen.getByText('screenshot.png (300 KB)')).toBeInTheDocument();
    expect(document.body.querySelector('.progress-bar')).toBeInTheDocument();
  });

  it('sizes a larger file in megabytes', () => {
    renderModal();
    attach(makeFile('recording.png', 12.4 * 1024 * 1024));
    expect(screen.getByText('recording.png (12.4 MB)')).toBeInTheDocument();
  });

  it('rounds a sub-kilobyte file to whole kilobytes', () => {
    renderModal();
    attach(makeFile('tiny.png', 900));
    expect(screen.getByText('tiny.png (1 KB)')).toBeInTheDocument();
  });

  it('walks the progress bar to full', () => {
    renderModal();
    attach(makeFile('screenshot.png'));
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '0%' });

    act(() => { vi.advanceTimersByTime(900); });
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '30%' });

    finishUpload();
    expect(document.body.querySelector('.progress')).toHaveStyle({ width: '100%' });
  });

  it('keeps every file that was picked, one after another', () => {
    renderModal();
    attach(makeFile('first.png'));
    attach(makeFile('second.png'));
    expect(document.body.querySelectorAll('.file-item')).toHaveLength(2);
  });
});

describe('files it refuses', () => {
  it('rejects a file over the fifty megabyte limit before uploading it', () => {
    renderModal();
    attach(makeFile('huge.png', 60 * 1024 * 1024));
    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
    // A rejected file gets an error label instead of a progress bar.
    expect(document.body.querySelector('.progress-bar')).toBeNull();
  });

  it('marks a file that failed at the end of its upload', () => {
    renderModal();
    attach(makeFile('Unable-to-read.png'));
    expect(document.body.querySelector('.progress-bar')).toBeInTheDocument();

    finishUpload();
    expect(screen.getByText('Unable to upload. Please try again')).toBeInTheDocument();
  });
});

describe('saving', () => {
  it('does nothing at all before any file has been picked', async () => {
    renderModal();
    await save();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing while the upload is still running', async () => {
    renderModal();
    attach(makeFile('screenshot.png'));
    act(() => { vi.advanceTimersByTime(600); });
    await save();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does nothing when the only file was refused on size', async () => {
    renderModal();
    attach(makeFile('huge.png', 60 * 1024 * 1024));
    finishUpload();
    await save();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does nothing when the only file failed at the end of its upload', async () => {
    renderModal();
    attach(makeFile('Unable-to-read.png'));
    finishUpload();
    await save();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends the finished file and closes', async () => {
    const file = makeFile('screenshot.png');
    renderModal();
    attach(file);
    finishUpload();
    await save();

    expect(onSave).toHaveBeenCalledWith(file);
    expect(onClose).toHaveBeenCalled();
  });

  it('sends the first usable file when several were picked', async () => {
    const good = makeFile('good.png');
    renderModal();
    attach(makeFile('huge.png', 60 * 1024 * 1024), good);
    finishUpload();
    await save();
    expect(onSave).toHaveBeenCalledWith(good);
  });

  it('forgets the files it had once the save lands', async () => {
    renderModal();
    attach(makeFile('screenshot.png'));
    finishUpload();
    await save();
    expect(document.body.querySelector('.file-list')).toBeNull();
  });

  it('locks the button while the save is in flight', async () => {
    let release;
    onSave.mockReturnValue(new Promise((r) => { release = r; }));
    renderModal();
    attach(makeFile('screenshot.png'));
    finishUpload();

    await act(async () => { fireEvent.click(primary()); });
    expect(primary()).toBeDisabled();
    expect(document.body.querySelector('.modal-button-spinner')).toBeInTheDocument();

    await act(async () => { release(); });
    expect(onClose).toHaveBeenCalled();
  });

  it('swallows a refused save and keeps the file for a retry', async () => {
    onSave.mockRejectedValueOnce(new Error('attachment rejected'));
    renderModal();
    attach(makeFile('screenshot.png'));
    finishUpload();
    await save();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/screenshot\.png/)).toBeInTheDocument();
    expect(primary()).not.toBeDisabled();

    await save();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('abandoning the upload', () => {
  it('closes on Cancel without saving anything', () => {
    renderModal();
    attach(makeFile('screenshot.png'));
    finishUpload();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('one failing file among several', () => {
  it('marks only the file that failed', () => {
    renderModal();
    // Both uploads run to completion; only the one whose name carries the
    // failure hook is rewritten, so the other takes the map's untouched arm.
    attach(makeFile('Unable-to-read.png'), makeFile('fine.png'));
    finishUpload();
    expect(screen.getAllByText('Unable to upload. Please try again')).toHaveLength(1);
    expect(screen.getByText(/fine\.png/)).toBeInTheDocument();
  });
});
