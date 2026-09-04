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
  const expectMessage = async (pattern) => {
    await waitFor(() => expect(screen.getByText(pattern)).toBeInTheDocument());
    expect(spinner()).toBeNull();
  };

  const NOT_VIEWABLE = /couldn't be shown here/i;
  const EXPIRED = /secure link is missing or has expired/i;

  // A bucket with no CORS rule answers 200 and the browser throws the response
  // away, which reaches script as the same rejection as being offline. Calling
  // that "expired" points whoever is debugging it at a link that is fine.
  it("reports a blocked fetch as not viewable, not as expired", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DocxPreview fileUrl={URL_A} />);
    await expectMessage(NOT_VIEWABLE);
    expect(screen.queryByText(EXPIRED)).toBeNull();
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });

  // A refusal really is about the link, so it keeps the stronger wording.
  it("reports a 403 as an expired or missing link", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403, blob: async () => new Blob([""]) });
    render(<DocxPreview fileUrl={URL_A} />);
    await expectMessage(EXPIRED);
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });

  it("reports a 404 as gone", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404, blob: async () => new Blob([""]) });
    render(<DocxPreview fileUrl={URL_A} />);
    await expectMessage(/no longer available/i);
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });

  it("reports any other status as not viewable", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, blob: async () => new Blob([""]) });
    render(<DocxPreview fileUrl={URL_A} />);
    await expectMessage(NOT_VIEWABLE);
    expect(docx.renderAsync).not.toHaveBeenCalled();
  });

  // The bytes arrived; it is the file that is the problem, not the link.
  it("reports an unparseable file as not viewable", async () => {
    docx.renderAsync.mockRejectedValue(new Error("corrupt"));
    render(<DocxPreview fileUrl={URL_A} />);
    await expectMessage(NOT_VIEWABLE);
  });

  it("reports a missing url as an expired link, without fetching", async () => {
    render(<DocxPreview fileUrl="" />);
    await expectMessage(EXPIRED);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Downloading still works when rendering does not: a plain navigation is not
  // subject to CORS, so the tab fallback reaches the file the fetch could not.
  it("offers the download prompt, and only when there is a handler", async () => {
    const onDownload = vi.fn();
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const { unmount } = render(<DocxPreview fileUrl={URL_A} onDownload={onDownload} />);
    await waitFor(() => expect(screen.getByText("Download File")).toBeInTheDocument());
    screen.getByText("Download File").click();
    expect(onDownload).toHaveBeenCalled();
    unmount();

    render(<DocxPreview fileUrl={URL_A} />);
    await waitFor(() => expect(screen.getByText(/couldn't be shown here/i)).toBeInTheDocument());
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
