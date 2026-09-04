import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * Rendering a Word document in the browser.
 *
 * The library is mocked: it lays pages out by measuring the DOM, which jsdom
 * cannot do. What is worth asserting here is everything around it -- that the
 * bytes are fetched from the signed url, that the library is only pulled in
 * once a Word file is actually opened, that a refusal falls back to the
 * download prompt rather than an empty page, and that a second file opened
 * mid-render cannot be painted over by the first.
 */

const docx = vi.hoisted(() => ({ renderAsync: vi.fn(async () => {}) }));
vi.mock("docx-preview", () => ({ renderAsync: docx.renderAsync }));

import DocxPreview from "../Components/ReusableModal/DocxPreview";

const URL_A = "https://signed/a.docx?X-Amz-Signature=abc";

const okResponse = (body = "docx bytes") => ({
  ok: true,
  status: 200,
  blob: async () => new Blob([body]),
});

beforeEach(() => {
  vi.clearAllMocks();
  docx.renderAsync.mockResolvedValue(undefined);
  global.fetch = vi.fn().mockResolvedValue(okResponse());
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

const spinner = () => document.querySelector(".doc-viewer-spinner");
const surface = () => document.querySelector(".docx-preview-surface");

describe("rendering the document", () => {
  it("fetches the file and hands the bytes to the renderer", async () => {
    render(<DocxPreview fileUrl={URL_A} />);

    await waitFor(() => expect(docx.renderAsync).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(URL_A);

    const [blob, container] = docx.renderAsync.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    // It must be given the live node, since it measures while laying out.
    expect(container).toBe(surface());
  });

  it("clears the loader once the document is laid out", async () => {
    render(<DocxPreview fileUrl={URL_A} />);
    expect(spinner()).not.toBeNull();
    await waitFor(() => expect(spinner()).toBeNull());
  });

  // display:none would zero every measurement the library takes.
  it("never hides the surface it renders into", async () => {
    render(<DocxPreview fileUrl={URL_A} />);
    expect(surface().hasAttribute("hidden")).toBe(false);
    await waitFor(() => expect(docx.renderAsync).toHaveBeenCalled());
    expect(surface().hasAttribute("hidden")).toBe(false);
  });
});

describe("when it cannot be rendered", () => {
  const expectFallback = async () => {
    await waitFor(() =>
      expect(screen.getByText(/secure link is missing or has expired/i)).toBeInTheDocument()
    );
    expect(spinner()).toBeNull();
  };

  // Reading the bytes needs CORS on the bucket, which framing a PDF does not.
  it("falls back when the fetch is refused outright", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DocxPreview fileUrl={URL_A} />);
    await expectFallback();
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });

  it.each([[403], [404], [500]])("falls back on a %i", async (status) => {
    global.fetch.mockResolvedValue({ ok: false, status, blob: async () => new Blob([""]) });
    render(<DocxPreview fileUrl={URL_A} />);
    await expectFallback();
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });

  it("falls back when the file itself cannot be parsed", async () => {
    docx.renderAsync.mockRejectedValue(new Error("corrupt"));
    render(<DocxPreview fileUrl={URL_A} />);
    await expectFallback();
  });

  it("falls back when there is no url at all, without fetching", async () => {
    render(<DocxPreview fileUrl="" />);
    await expectFallback();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("offers the download prompt, and only when there is a handler", async () => {
    const onDownload = vi.fn();
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const { unmount } = render(<DocxPreview fileUrl={URL_A} onDownload={onDownload} />);
    await waitFor(() => expect(screen.getByText("Download File")).toBeInTheDocument());
    screen.getByText("Download File").click();
    expect(onDownload).toHaveBeenCalled();
    unmount();

    render(<DocxPreview fileUrl={URL_A} />);
    await waitFor(() =>
      expect(screen.getByText(/secure link is missing or has expired/i)).toBeInTheDocument()
    );
    expect(screen.queryByText("Download File")).toBeNull();
  });
});

describe("when the file changes mid-render", () => {
  // renderAsync writes straight into the node, so a run left over from the
  // previous file must not paint over the newer one.
  it("does not render a file that was replaced before it finished", async () => {
    let release;
    global.fetch.mockReturnValueOnce(new Promise((r) => { release = r; }));

    const { rerender, unmount } = render(<DocxPreview fileUrl={URL_A} />);
    rerender(<DocxPreview fileUrl="https://signed/b.docx?X-Amz-Signature=def" />);

    release(okResponse());
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // Only the second file is ever laid out.
    await waitFor(() => expect(docx.renderAsync).toHaveBeenCalledTimes(1));
    unmount();
  });

  it("stops on unmount rather than writing into a detached node", async () => {
    let release;
    global.fetch.mockReturnValue(new Promise((r) => { release = r; }));

    const { unmount } = render(<DocxPreview fileUrl={URL_A} />);
    unmount();
    release(okResponse());

    await new Promise((r) => setTimeout(r, 0));
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });
});
