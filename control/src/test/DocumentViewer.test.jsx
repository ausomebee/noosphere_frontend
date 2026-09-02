import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import DocumentViewer from '../Components/ReusableModal/DocumentViewer';

/**
 * The document preview overlay.
 *
 * Which control it renders is decided entirely by the file extension it can
 * scrape off the url — after stripping any query string, because signed S3
 * links carry one. A PDF gets an iframe, an image an `img`, and anything else
 * (including a Word file, which no browser will inline) gets a download prompt.
 *
 * Downloading fetches the file and clicks a synthetic link so the browser saves
 * it under the name the caller supplied; if that fetch fails it falls back to
 * opening the url in a new tab, which is the only route a cross-origin file has.
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

  it.each(['doc', 'docx'])('offers a %s as a download instead', (ext) => {
    renderViewer({ fileUrl: `https://cdn.example.com/notes.${ext}` });
    expect(document.body.querySelector('.doc-viewer-fallback')).toBeInTheDocument();
    expect(screen.getByText('Download File')).toBeInTheDocument();
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
    global.fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(['x']) });

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
    global.fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(['x']) });

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
    expect(open).toHaveBeenCalledWith('https://cdn.example.com/report.pdf', '_blank');
  });

  it('downloads from the fallback prompt too', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('cross-origin'));
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});

    renderViewer({ fileUrl: 'https://cdn.example.com/notes.docx' });
    await act(async () => {
      fireEvent.click(screen.getByText('Download File'));
    });
    expect(open).toHaveBeenCalled();
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
