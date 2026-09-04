import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * Choosing how to show a Word document.
 *
 * Preferred is the server-converted PDF, because a frame is a navigation and so
 * is not subject to CORS -- which is the only reason the file can be shown at
 * all while the bucket carries no CORS rule. Everything else falls through to
 * rendering the .docx in the browser, including the conversion route not being
 * deployed yet, so this ships safely ahead of the backend.
 */

const images = vi.hoisted(() => ({ getPdfPreviewUrl: vi.fn() }));
vi.mock("../api/imagesApi", () => ({
  default: { GetPdfPreviewUrl: images.getPdfPreviewUrl },
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({ accessToken: "access-1", refreshToken: "refresh-1" }),
}));

// Covered by its own suite; standing it in keeps a fetch and a zip library out.
vi.mock("../Components/ReusableModal/DocxPreview", () => ({
  default: ({ fileUrl }) => <div data-testid="docx-local" data-url={fileUrl} />,
}));

import WordDocument from "../Components/ReusableModal/WordDocument";

const STORED = "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/a.docx?X-Amz-Signature=abc";
const PDF = "https://signed/a.pdf?X-Amz-Signature=def";

const frame = () => document.querySelector("iframe");
const local = () => screen.queryByTestId("docx-local");

beforeEach(() => {
  vi.clearAllMocks();
  images.getPdfPreviewUrl.mockResolvedValue(PDF);
});

afterEach(() => vi.restoreAllMocks());

describe("when the converted PDF is available", () => {
  it("frames it, asking with the object key", async () => {
    render(<WordDocument fileUrl={STORED} fileName="a.docx" />);

    await waitFor(() => expect(frame()).not.toBeNull());
    expect(frame().getAttribute("src")).toBe(PDF);
    expect(images.getPdfPreviewUrl).toHaveBeenCalledWith({
      key: "a.docx",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    // A frame is not a script read, so the local renderer is not needed.
    expect(local()).toBeNull();
  });

  it("shows a loader while it is being asked for", () => {
    render(<WordDocument fileUrl={STORED} fileName="a.docx" />);
    expect(document.querySelector(".doc-viewer-spinner")).not.toBeNull();
    expect(frame()).toBeNull();
    expect(local()).toBeNull();
  });

  it("titles the frame for assistive technology", async () => {
    render(<WordDocument fileUrl={STORED} fileName="notes.docx" />);
    await waitFor(() => expect(frame()).not.toBeNull());
    expect(frame().getAttribute("title")).toBe("notes.docx");
  });
});

describe("when it is not", () => {
  const expectLocal = async () => {
    await waitFor(() => expect(local()).not.toBeNull());
    expect(local()).toHaveAttribute("data-url", STORED);
    expect(frame()).toBeNull();
  };

  // The route does not exist yet, so this is today's behaviour.
  it("renders in the browser when the route is missing", async () => {
    images.getPdfPreviewUrl.mockRejectedValue(new Error("404"));
    render(<WordDocument fileUrl={STORED} fileName="a.docx" />);
    await expectLocal();
  });

  it("renders in the browser when conversion returned no url", async () => {
    images.getPdfPreviewUrl.mockResolvedValue(null);
    render(<WordDocument fileUrl={STORED} fileName="a.docx" />);
    await expectLocal();
  });

  // Nothing stored means nothing to convert, so it does not even ask.
  it("renders in the browser for a url that is not a stored object", async () => {
    render(<WordDocument fileUrl="https://cdn.example.com/a.docx" fileName="a.docx" />);
    await waitFor(() => expect(local()).not.toBeNull());
    expect(images.getPdfPreviewUrl).not.toHaveBeenCalled();
  });
});

describe("when the file changes", () => {
  it("does not frame a PDF belonging to the previous file", async () => {
    let release;
    images.getPdfPreviewUrl.mockReturnValueOnce(new Promise((r) => { release = r; }));

    const { rerender } = render(<WordDocument fileUrl={STORED} fileName="a.docx" />);
    images.getPdfPreviewUrl.mockResolvedValue(null);
    rerender(
      <WordDocument
        fileUrl={"https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/b.docx?X-Amz-Signature=x"}
        fileName="b.docx"
      />
    );

    release(PDF);

    // The stale answer must not win: the second file has no conversion.
    await waitFor(() => expect(local()).not.toBeNull());
    expect(frame()).toBeNull();
  });
});
