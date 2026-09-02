import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Every icon becomes a labelled stub, which is the only way to tell which of
// the five file-type icons the modal picked for a given filename.
const stub = vi.hoisted(() => (name) => (props) => (
  <span data-testid={`icon-${name}`} className={props.className} />
));
vi.mock('react-icons/bs', () => ({
  BsCloudUpload: stub('cloud'),
  BsFileEarmarkPdf: stub('pdf'),
  BsFileEarmarkPlay: stub('animation'),
}));
vi.mock('react-icons/fa', () => ({
  FaRegFile: stub('generic'),
  FaPhotoVideo: stub('video'),
  FaImage: stub('image'),
  FaCheckCircle: stub('done'),
}));
vi.mock('react-icons/ri', () => ({ RiDeleteBin6Line: stub('remove') }));
vi.mock('react-icons/io', () => ({ IoMdRefresh: stub('retry') }));

import UploadDocumentModal from '../Components/ReusableModal/UploadDocumentModal';

/**
 * The attach-a-document modal.
 *
 * There is no real upload behind it: choosing files starts a 300ms interval per
 * file that walks a progress number from 0 to 100, and a filename containing
 * "Unable" is the hook the mock uses to act out a failure. Anything over 50MB
 * is rejected outright and never gets an interval at all. All of that runs on
 * timers, so the tests below drive a fake clock.
 *
 * Note that choosing any file sets `uploading` and nothing ever clears it, so
 * the Attach files button is disabled from the first choice onwards -- the only
 * click that reaches the handler is one made before any file is chosen.
 */

const onClose = vi.fn();
const onUpload = vi.fn();

const renderModal = (props = {}) =>
  render(
    <UploadDocumentModal isOpen onClose={onClose} onUpload={onUpload} {...props} />
  );

const file = (name, sizeMB = 0.5) => {
  const f = new File(['x'], name, { type: 'application/octet-stream' });
  Object.defineProperty(f, 'size', { value: Math.round(sizeMB * 1024 * 1024) });
  return f;
};

const choose = (...files) =>
  fireEvent.change(document.body.querySelector('.upload-input'), {
    target: { files },
  });

const items = () => Array.from(document.body.querySelectorAll('.file-item'));
const primary = () => document.body.querySelector('.primary-button');
const secondary = () => document.body.querySelector('.secondary-button');

// Ten ticks takes a file from 0 to 100.
const runUploads = async (ms = 3000) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Upload a document')).not.toBeInTheDocument();
  });

  it('opens on an empty drop zone', () => {
    renderModal();
    expect(screen.getByText('Upload a document')).toBeInTheDocument();
    expect(screen.getByTestId('icon-cloud')).toBeInTheDocument();
    expect(document.body.querySelector('.file-list')).toBeNull();
  });
});

describe('choosing files', () => {
  it('lists a chosen file with its size in kilobytes', () => {
    renderModal();
    choose(file('brief.txt', 0.5));
    expect(screen.getByText('brief.txt • 512 KB')).toBeInTheDocument();
  });

  it('sizes a larger file in megabytes', () => {
    renderModal();
    choose(file('brief.txt', 2.5));
    expect(screen.getByText('brief.txt • 2.5 MB')).toBeInTheDocument();
  });

  it('accumulates files across several choices', () => {
    renderModal();
    choose(file('one.txt'));
    choose(file('two.txt'));
    expect(items()).toHaveLength(2);
  });

  it('starts every file at nought percent', () => {
    renderModal();
    choose(file('brief.txt'));
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('the file-type icon', () => {
  it.each([
    ['a PDF', 'contract.pdf', 'icon-pdf'],
    ['an MP4', 'clip.mp4', 'icon-video'],
    ['an AVI', 'clip.avi', 'icon-video'],
    ['a MOV', 'clip.MOV', 'icon-video'],
    ['a GIF', 'loop.gif', 'icon-animation'],
    ['a PNG', 'shot.png', 'icon-image'],
    ['a JPG', 'shot.jpg', 'icon-image'],
    ['a JPEG', 'shot.jpeg', 'icon-image'],
    ['a WEBP', 'shot.webp', 'icon-image'],
    ['anything else', 'notes.txt', 'icon-generic'],
    ['a file with no extension at all', 'README', 'icon-generic'],
  ])('marks %s', (_case, name, testId) => {
    renderModal();
    choose(file(name));
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});

describe('the mock upload', () => {
  // Each tick writes to `index + files.length - newFiles.length`, where `files`
  // is still the pre-change list -- so the row it updates is the new file's
  // position shifted back by the size of its own batch. Every test here pins
  // where the progress actually lands rather than where it was meant to.
  const percentOf = (index) =>
    items()[index].querySelector('.progress-text')?.textContent;

  it('leaves the first batch of files sitting at nought percent forever', async () => {
    renderModal();
    choose(file('brief.txt'));
    await runUploads();
    expect(percentOf(0)).toBe('0%');
  });

  it('advances an earlier file when a later batch is chosen', async () => {
    renderModal();
    choose(file('one.txt'));
    choose(file('two.txt'));

    await runUploads(300);
    expect(percentOf(0)).toBe('10%');
    await runUploads(600);
    expect(percentOf(0)).toBe('30%');
    expect(percentOf(1)).toBe('0%');
  });

  it('finishes that file at a hundred percent and marks it done', async () => {
    renderModal();
    choose(file('one.txt'));
    choose(file('two.txt'));
    await runUploads();

    expect(percentOf(0)).toBe('100%');
    expect(screen.getAllByTestId('icon-done')).toHaveLength(1);
  });

  it('stops ticking once it is finished', async () => {
    renderModal();
    choose(file('one.txt'));
    choose(file('two.txt'));
    await runUploads(9000);
    expect(percentOf(0)).toBe('100%');
  });

  it('fails whichever row the name that cannot be uploaded landed on', async () => {
    // "Unable" in the filename is the stand-in for a server error, and it is
    // applied to the same shifted row -- so the failure is reported against the
    // file chosen before it.
    renderModal();
    choose(file('one.txt'));
    choose(file('Unable-to-scan.pdf'));
    await runUploads();

    expect(screen.getByText('Unable to upload. Please try again')).toBeInTheDocument();
    expect(items()[0].textContent).toContain('one.txt');
    expect(items()[0].textContent).toContain('Unable to upload');
  });
});

describe('files that are too big', () => {
  it('refuses anything over fifty megabytes', () => {
    renderModal();
    choose(file('huge.zip', 60));
    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
  });

  it('gives a refused file no progress bar and no upload', async () => {
    renderModal();
    choose(file('huge.zip', 60));
    await runUploads();
    expect(document.body.querySelector('.progress-bar')).toBeNull();
    expect(screen.getByText('File size exceeds 50MB limit')).toBeInTheDocument();
  });

  it('still lists the acceptable files chosen alongside it', async () => {
    renderModal();
    choose(file('huge.zip', 60), file('brief.txt', 0.5));
    await runUploads();

    expect(items()).toHaveLength(2);
    expect(items()[1].querySelector('.progress-text').textContent).toBe('0%');
  });
});

describe('managing the list', () => {
  it('removes a file from the list', () => {
    renderModal();
    choose(file('one.txt'), file('two.txt'));
    fireEvent.click(document.body.querySelectorAll('.remove-file')[0]);

    expect(items()).toHaveLength(1);
    expect(screen.getByText(/two\.txt/)).toBeInTheDocument();
  });

  it('drops the whole list once the last file is removed', () => {
    renderModal();
    choose(file('one.txt'));
    fireEvent.click(document.body.querySelector('.remove-file'));
    expect(document.body.querySelector('.file-list')).toBeNull();
  });

  it('offers a retry only on a failed file', () => {
    renderModal();
    choose(file('brief.txt'));
    expect(document.body.querySelector('.retry-file')).toBeNull();

    choose(file('huge.zip', 60));
    expect(document.body.querySelectorAll('.retry-file')).toHaveLength(1);
  });

  it('clears the error and runs the upload again on retry', async () => {
    renderModal();
    choose(file('huge.zip', 60));
    fireEvent.click(document.body.querySelector('.retry-file'));

    expect(screen.queryByText('File size exceeds 50MB limit')).not.toBeInTheDocument();
    await runUploads();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByTestId('icon-done')).toBeInTheDocument();
  });
});

describe('the footer buttons', () => {
  it('hands an empty list back and closes when nothing was chosen', () => {
    renderModal();
    fireEvent.click(primary());

    expect(onUpload).toHaveBeenCalledWith([]);
    expect(onClose).toHaveBeenCalled();
  });

  it('locks the attach button from the moment a file is chosen', () => {
    // `uploading` is set on every choice and never cleared while the modal is
    // open, so the files that were chosen can never actually be attached.
    renderModal();
    expect(primary()).toBeEnabled();
    choose(file('brief.txt'));
    expect(primary()).toBeDisabled();
  });

  it('stays locked long after the mock upload has finished', async () => {
    renderModal();
    choose(file('brief.txt'));
    await runUploads();
    expect(primary()).toBeDisabled();
  });

  it('throws the list away and closes on cancel', () => {
    renderModal();
    choose(file('brief.txt'));
    fireEvent.click(secondary());

    expect(onClose).toHaveBeenCalled();
    expect(onUpload).not.toHaveBeenCalled();
    expect(document.body.querySelector('.file-list')).toBeNull();
  });
});

describe('retrying one file out of several', () => {
  it('leaves the other files alone while the retried one uploads again', async () => {
    renderModal();
    // Both are over the limit, so both start out failed and both offer a retry;
    // only the first is retried, and the second must keep its error.
    choose(file('huge-a.zip', 60), file('huge-b.zip', 60));
    expect(document.body.querySelectorAll('.retry-file')).toHaveLength(2);

    fireEvent.click(document.body.querySelectorAll('.retry-file')[0]);
    expect(screen.getAllByText('File size exceeds 50MB limit')).toHaveLength(1);

    await runUploads();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getAllByText('File size exceeds 50MB limit')).toHaveLength(1);
  });
});
