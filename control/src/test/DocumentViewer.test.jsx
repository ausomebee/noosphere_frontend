import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import DocumentViewer from '../Components/ReusableModal/DocumentViewer';

// These cover the overlay's routing, not how a Word file is then shown, which
// has its own suite. Standing it in keeps a network fetch and a megabyte of
// zip library out of every case here.
vi.mock("../Components/ReusableModal/WordDocument", () => ({
  default: ({ fileUrl, onDownload }) => (
    <div data-testid="word-document" data-url={fileUrl}>
      <button onClick={onDownload}>Save a copy</button>
    </div>
  ),
}));


/**
 * The document preview overlay.
 *
 * Which control it renders is decided entirely by the file extension it can
 * scrape off the url — after stripping any query string, because signed S3
 * links carry one. A PDF gets an iframe, an image an `img`, and anything else
 * (including a Word file, which no browser will inline) gets a download prompt.
 *
 * Downloading fetches the file and clicks a synthetic link so the browser saves
 * it under the name the caller supplied. A blocked fetch still falls back to a
 * new tab, which is the one route left when only CORS is in the way, but a
 * refused *response* does not: a 403 or 404 is reported instead, rather than
 * saving S3's error body as though it were the document.
 *
 * An unsigned bucket link is refused before any of that, since there is no
 * credential the browser could add, and the overlay says so in place of a
 * preview that would sit blank.
 */

const onClose = vi.fn();

const renderViewer = (props = {}) =>
  render(
    <DocumentViewer
      isOpen
      fileUrl="https://cdn.example.com/report.pdf"
      fileName="report.pdf"
      onClose={onClose}
      {...props}
    />
  );

const body = () => document.body.querySelector('.doc-viewer-body');

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:doc');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('when it renders at all', () => {
  it('renders nothing while closed', () => {
    renderViewer({ isOpen: false });
    expect(document.body.querySelector('.doc-viewer-overlay')).toBeNull();
  });

  it('titles itself after the file', () => {
    renderViewer();
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('titles itself generically for an unnamed file', () => {
    renderViewer({ fileName: undefined });
    expect(screen.getByText('Document Preview')).toBeInTheDocument();
  });
});

describe('choosing how to show the file', () => {
  it('frames a PDF, and stops showing the spinner once it loads', async () => {
    renderViewer();
    const frame = document.body.querySelector('.doc-viewer-iframe');
    expect(frame).toBeInTheDocument();
    expect(body()).toHaveAttribute('aria-busy', 'true');

    fireEvent.load(frame);
    await waitFor(() => expect(body()).toHaveAttribute('aria-busy', 'false'));
  });

  it.each(['jpg', 'jpeg', 'png', 'gif', 'webp'])('shows a %s inline', (ext) => {
    renderViewer({ fileUrl: `https://cdn.example.com/shot.${ext}` });
    expect(document.body.querySelector('.doc-viewer-image')).toBeInTheDocument();
  });

  it('stops showing the spinner once an image loads', async () => {
    renderViewer({ fileUrl: 'https://cdn.example.com/shot.png' });
    fireEvent.load(document.body.querySelector('.doc-viewer-image'));
    await waitFor(() => expect(body()).toHaveAttribute('aria-busy', 'false'));
  });

  it('stops showing the spinner when an image fails to load', async () => {
    renderViewer({ fileUrl: 'https://cdn.example.com/shot.png' });
    fireEvent.error(document.body.querySelector('.doc-viewer-image'));
    await waitFor(() => expect(body()).toHaveAttribute('aria-busy', 'false'));
  });

  it.each(['doc', 'docx'])('renders a %s in the browser', (ext) => {
    const url = `https://cdn.example.com/notes.${ext}`;
    renderViewer({ fileUrl: url });
    expect(screen.getByTestId('word-document')).toHaveAttribute('data-url', url);
    // Not the download prompt any more, and never a third-party frame.
    expect(document.body.querySelector('.doc-viewer-fallback')).toBeNull();
    expect(document.body.querySelector('iframe')).toBeNull();
  });

  it('offers anything else as a download too', () => {
    renderViewer({ fileUrl: 'https://cdn.example.com/archive.zip' });
    expect(document.body.querySelector('.doc-viewer-fallback')).toBeInTheDocument();
    // Nothing is loading, so the spinner never appears for these.
    expect(body()).toHaveAttribute('aria-busy', 'false');
  });

  it('ignores a signed link\'s query string when reading the extension', () => {
    renderViewer({ fileUrl: 'https://cdn.example.com/report.pdf?X-Amz-Signature=abc' });
    expect(document.body.querySelector('.doc-viewer-iframe')).toBeInTheDocument();
  });

  it('falls back to a download prompt for a url it cannot read at all', () => {
    renderViewer({ fileUrl: undefined });
    expect(document.body.querySelector('.doc-viewer-fallback')).toBeInTheDocument();
  });
});

describe('downloading', () => {
  it('saves the file under the name it was given', async () => {
    const click = vi.fn();
    const created = document.createElement('a');
    vi.spyOn(created, 'click').mockImplementation(click);
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'a' ? created : Object.getPrototypeOf(document).createElement.call(document, tag)
    );
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) });

    renderViewer();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Download file'));
    });

    expect(global.fetch).toHaveBeenCalledWith('https://cdn.example.com/report.pdf');
    expect(created.download).toBe('report.pdf');
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:doc');
  });

  it('names an unnamed download generically', async () => {
    const created = document.createElement('a');
    vi.spyOn(created, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'a' ? created : Object.getPrototypeOf(document).createElement.call(document, tag)
    );
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) });

    renderViewer({ fileName: undefined });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Download file'));
    });
    expect(created.download).toBe('document');
  });

  it('opens the url in a new tab when the fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('cross-origin'));
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});

    renderViewer();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Download file'));
    });
    expect(open).toHaveBeenCalledWith('https://cdn.example.com/report.pdf', '_blank', 'noopener');
  });

  it('downloads from the fallback prompt too', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('cross-origin'));
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});

    // A type with no preview of its own: Word now renders instead.
    renderViewer({ fileUrl: 'https://cdn.example.com/archive.zip' });
    await act(async () => {
      fireEvent.click(screen.getByText('Download File'));
    });
    expect(open).toHaveBeenCalled();
  });
});

describe('a link that cannot work', () => {
  const UNSIGNED = 'https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/x.pdf';

  it('explains itself instead of framing a pdf it cannot read', () => {
    renderViewer({ fileUrl: UNSIGNED, fileName: 'x.pdf' });

    expect(document.body.querySelector('.doc-viewer-fallback')).not.toBeNull();
    expect(document.body.querySelector('iframe')).toBeNull();
    expect(screen.getByText(/secure link is missing or has expired/i)).toBeInTheDocument();
  });

  // Offering a download beside "this can't be opened" would contradict itself.
  it('withholds the download prompt', () => {
    renderViewer({ fileUrl: UNSIGNED, fileName: 'x.pdf' });
    expect(screen.queryByText('Download File')).toBeNull();
  });

  // Nothing is loading, so a spinner would never stop.
  it('shows no spinner', () => {
    renderViewer({ fileUrl: UNSIGNED, fileName: 'x.pdf' });
    expect(body().getAttribute('aria-busy')).toBe('false');
    expect(document.body.querySelector('.doc-viewer-spinner')).toBeNull();
  });

  it('still frames a signed link to the same object', () => {
    renderViewer({ fileUrl: `${UNSIGNED}?X-Amz-Signature=abc`, fileName: 'x.pdf' });
    expect(document.body.querySelector('iframe')).not.toBeNull();
  });

  it('reports a refused response rather than saving it', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      blob: async () => new Blob(['<Error>AccessDenied</Error>']),
    });
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});

    renderViewer();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Download file'));
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});

describe("a file the browser cannot preview", () => {
  // Only a pdf iframe or an image ever reports that it loaded. A Word file
  // reports nothing, so holding the loader for it left the spinner turning
  // forever with the download prompt hidden behind it.
  it("hands a Word file straight to the renderer, with no loader of its own", () => {
    renderViewer({ fileUrl: "https://cdn.example.com/notes.docx", fileName: "notes.docx" });

    // The renderer runs its own loader while it fetches and lays the document
    // out; the overlay waiting on it too left a spinner that never stopped.
    expect(document.body.querySelector(".doc-viewer-spinner")).toBeNull();
    expect(document.body.querySelector(".doc-viewer-content-hidden")).toBeNull();
    expect(body().getAttribute("aria-busy")).toBe("false");
    expect(screen.getByTestId("word-document")).toBeInTheDocument();
  });

  it("does the same for a type it does not recognise", () => {
    renderViewer({ fileUrl: "https://cdn.example.com/archive.zip", fileName: "archive.zip" });
    expect(document.body.querySelector(".doc-viewer-spinner")).toBeNull();
    expect(screen.getByText("Download File")).toBeInTheDocument();
  });

  // The pdf and image paths must still wait for their load event.
  it("still holds the loader for a pdf until it loads", () => {
    renderViewer({ fileUrl: "https://cdn.example.com/a.pdf", fileName: "a.pdf" });
    expect(document.body.querySelector(".doc-viewer-spinner")).not.toBeNull();
  });
});

describe('closing', () => {
  it('closes from its own button', () => {
    renderViewer();
    fireEvent.click(screen.getByLabelText('Close document viewer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop itself is clicked', () => {
    renderViewer();
    const overlay = document.body.querySelector('.doc-viewer-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when something inside it is clicked', () => {
    renderViewer();
    fireEvent.click(document.body.querySelector('.doc-viewer-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    renderViewer();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores any other key', () => {
    renderViewer();
    fireEvent.keyDown(document, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening for Escape once closed', () => {
    const { rerender } = renderViewer();
    rerender(
      <DocumentViewer
        isOpen={false}
        fileUrl="https://cdn.example.com/report.pdf"
        fileName="report.pdf"
        onClose={onClose}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the spinner again when a new file is opened', async () => {
    const { rerender } = renderViewer();
    fireEvent.load(document.body.querySelector('.doc-viewer-iframe'));
    await waitFor(() => expect(body()).toHaveAttribute('aria-busy', 'false'));

    rerender(
      <DocumentViewer
        isOpen
        fileUrl="https://cdn.example.com/other.pdf"
        fileName="other.pdf"
        onClose={onClose}
      />
    );
    await waitFor(() => expect(body()).toHaveAttribute('aria-busy', 'true'));
  });
});
