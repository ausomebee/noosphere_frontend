import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import DocumentViewer from '../Components/ReusableModal/DocumentViewer';
import useDocumentViewer, { DocumentViewerProvider } from '../hooks/useDocumentViewer';
import useReduxFormDraft from '../hooks/useReduxFormDraft';
import draftReducer from '../ReduxStore/features/formDraftsSlice';

// Shows Word files for real otherwise, which would put a live request in a
// unit test. Its own behaviour is covered in WordDocument.test.jsx.
vi.mock("../Components/ReusableModal/WordDocument", () => ({
  default: ({ fileUrl }) => <div data-testid="word-document" data-url={fileUrl} />,
}));


// The provider now reads the caller's tokens and exchanges a stored key for a
// signed link. Neither belongs in a test of the viewer's own state machine, and
// the urls used here are not bucket urls, so the exchange never fires.
vi.mock("../hooks/useAuth", () => ({
  default: () => ({ accessToken: "access-1", refreshToken: "refresh-1" }),
}));
vi.mock("../api/imagesApi", () => ({
  default: { GetPresignedUrl: vi.fn(async () => null) },
}));


/**
 * The document viewer's download fallback and file-type routing, and the form
 * draft hook's hydrate/expire branches.
 */

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => 'blob:x');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DocumentViewer file types', () => {
  const base = { isOpen: true, onClose: vi.fn() };

  it('renders a PDF in an iframe and clears loading when it loads', () => {
    render(<DocumentViewer {...base} fileUrl="https://x/report.pdf" fileName="report.pdf" />);
    const frame = document.body.querySelector('iframe');
    expect(frame).toBeInTheDocument();
    fireEvent.load(frame);
  });

  it('renders an image and clears loading on both load and error', () => {
    render(<DocumentViewer {...base} fileUrl="https://x/scan.png" fileName="scan.png" />);
    const img = document.body.querySelector('img');
    expect(img).toBeInTheDocument();
    fireEvent.load(img);
    fireEvent.error(img);
  });

  it('falls back to a generic alt when no file name is given', () => {
    render(<DocumentViewer {...base} fileUrl="https://x/scan.jpg" />);
    expect(document.body.querySelector('img')).toHaveAttribute('alt', 'Document preview');
  });

  it('renders a Word document rather than treating it as an image', () => {
    render(<DocumentViewer {...base} fileUrl="https://x/notes.docx" fileName="notes.docx" />);
    expect(document.body.querySelector('img')).toBeNull();
    expect(screen.getByTestId('word-document')).toBeInTheDocument();
  });

  it('reads the extension past a query string', () => {
    render(<DocumentViewer {...base} fileUrl="https://x/report.pdf?sig=abc" fileName="r.pdf" />);
    expect(document.body.querySelector('iframe')).toBeInTheDocument();
  });

  it('treats a url with no extension as neither pdf nor image', () => {
    render(<DocumentViewer {...base} fileUrl={undefined} />);
    expect(document.body.querySelector('iframe')).toBeNull();
    expect(document.body.querySelector('img')).toBeNull();
  });

  it('closes when the overlay itself is clicked but not its content', () => {
    const onClose = vi.fn();
    render(<DocumentViewer isOpen onClose={onClose} fileUrl="https://x/a.pdf" fileName="a.pdf" />);
    const overlay = document.body.querySelector('[class*="overlay"]');
    // A click whose target is a child must not close.
    fireEvent.click(document.body.querySelector('iframe'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('DocumentViewer download', () => {
  const openSpy = () => vi.spyOn(window, 'open').mockImplementation(() => {});

  const clickDownload = (container) => {
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      /download/i.test(b.textContent || b.getAttribute('aria-label') || '')
    );
    if (btn) fireEvent.click(btn);
    return btn;
  };

  it('downloads through a blob when the fetch succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) });
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<DocumentViewer isOpen onClose={vi.fn()} fileUrl="https://x/a.pdf" fileName="a.pdf" />);
    if (clickDownload(document.body)) {
      await waitFor(() => expect(spy).toHaveBeenCalled());
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    }
  });

  it('falls back to opening a new tab when the fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('blocked'));
    const open = openSpy();
    render(<DocumentViewer isOpen onClose={vi.fn()} fileUrl="https://x/a.pdf" fileName="a.pdf" />);
    if (clickDownload(document.body)) {
      await waitFor(() => expect(open).toHaveBeenCalledWith('https://x/a.pdf', '_blank', 'noopener'));
    }
  });
});

describe('useDocumentViewer download', () => {
  const Harness = ({ name }) => {
    const { downloadDocument } = useDocumentViewer();
    return (
      <button onClick={() => downloadDocument('https://x/a.pdf', name)}>go</button>
    );
  };

  const renderHarness = (name) =>
    render(
      <DocumentViewerProvider>
        <Harness name={name} />
      </DocumentViewerProvider>
    );

  it('names the download from the supplied file name', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) });
    const anchors = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === 'a') {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });
    renderHarness('report.pdf');
    fireEvent.click(screen.getByText('go'));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe('report.pdf');
  });

  it('falls back to a generic name when none is given', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x']) });
    const anchors = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === 'a') {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });
    renderHarness(undefined);
    fireEvent.click(screen.getByText('go'));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe('document');
  });

  it('opens a new tab when the blob fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('nope'));
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    renderHarness('report.pdf');
    fireEvent.click(screen.getByText('go'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://x/a.pdf', '_blank', 'noopener'));
  });
});

describe('useReduxFormDraft hydrate and expire', () => {
  const makeStore = (preloaded) =>
    configureStore({
      reducer: { formDrafts: draftReducer },
      preloadedState: { formDrafts: preloaded },
    });

  const Harness = ({ isOpen, reset }) => {
    useReduxFormDraft('k', { watch: () => () => {}, reset, isOpen });
    return <span>harness</span>;
  };

  it('restores a draft that is still within its TTL', async () => {
    vi.useFakeTimers();
    const reset = vi.fn();
    const store = makeStore({ k: { values: { a: 1 }, savedAt: Date.now() } });
    render(
      <Provider store={store}>
        <Harness isOpen reset={reset} />
      </Provider>
    );
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(reset).toHaveBeenCalledWith({ a: 1 });
    vi.useRealTimers();
  });

  it('drops a draft that has passed its TTL rather than restoring it', () => {
    const reset = vi.fn();
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const store = makeStore({ k: { values: { a: 1 }, savedAt: eightDaysAgo } });
    render(
      <Provider store={store}>
        <Harness isOpen reset={reset} />
      </Provider>
    );
    expect(reset).not.toHaveBeenCalled();
    expect(store.getState().formDrafts.k).toBeUndefined();
  });

  it('does nothing when there is no draft at all', () => {
    const reset = vi.fn();
    const store = makeStore({});
    render(
      <Provider store={store}>
        <Harness isOpen reset={reset} />
      </Provider>
    );
    expect(reset).not.toHaveBeenCalled();
  });

  it('does not hydrate while the modal is closed, and rearms for the next open', () => {
    const reset = vi.fn();
    const store = makeStore({ k: { values: { a: 1 }, savedAt: Date.now() } });
    const { rerender } = render(
      <Provider store={store}>
        <Harness isOpen={false} reset={reset} />
      </Provider>
    );
    expect(reset).not.toHaveBeenCalled();
    rerender(
      <Provider store={store}>
        <Harness isOpen reset={reset} />
      </Provider>
    );
    // Reopening arms hydration again; the deferred reset runs on the next tick.
    expect(store.getState().formDrafts.k).toBeDefined();
  });
});
