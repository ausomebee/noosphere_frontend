import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

/**
 * Saving a document.
 *
 * A stored object is read through our own API, which streams the bytes from
 * the bucket -- the only route script has, since a bucket response carries no
 * CORS header and is discarded by the browser however good the signed link is.
 * Anything else is fetched directly. Nothing here throws: a failed download
 * reports itself and the page carries on.
 */

const images = vi.hoisted(() => ({ getFileBlob: vi.fn() }));
vi.mock("../api/imagesApi", () => ({
  default: { GetFileBlob: images.getFileBlob },
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({ accessToken: "access-1", refreshToken: "refresh-1" }),
}));

import useDocumentDownload from "../hooks/useDocumentDownload";

const STORED =
  "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/1699999999-notes.docx?X-Amz-Signature=abc";
const EXTERNAL = "https://cdn.example.com/brochure.pdf";

const download = () => renderHook(() => useDocumentDownload()).result.current;

let clickSpy;
let openSpy;

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:generated");
  URL.revokeObjectURL = vi.fn();
  openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

describe("a stored object", () => {
  it("streams it through the API and saves it", async () => {
    const blob = new Blob(["bytes"]);
    images.getFileBlob.mockResolvedValue(blob);

    await download()(STORED, "notes.docx");

    expect(images.getFileBlob).toHaveBeenCalledWith({
      key: "1699999999-notes.docx",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:generated");
    // The bucket is never read directly.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("saves it under the name it was given", async () => {
    images.getFileBlob.mockResolvedValue(new Blob(["bytes"]));
    const names = [];
    clickSpy.mockImplementation(function () { names.push(this.download); });

    await download()(STORED, "payslip.docx");
    await download()(STORED, "");

    expect(names).toEqual(["payslip.docx", "document"]);
  });

  it("reports a refusal instead of throwing", async () => {
    images.getFileBlob.mockRejectedValue(new Error("Request failed"));

    await expect(download()(STORED, "notes.docx")).resolves.toBeUndefined();

    expect(toast.showToast).toHaveBeenCalledWith("Request failed", "error");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("reports an empty body rather than saving nothing", async () => {
    images.getFileBlob.mockResolvedValue(null);

    await download()(STORED, "notes.docx");

    expect(toast.showToast).toHaveBeenCalledWith(expect.stringMatching(/try again/i), "error");
    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe("any other url", () => {
  it("is fetched directly, without going near the stream route", async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(["x"]) });

    await download()(EXTERNAL, "brochure.pdf");

    expect(global.fetch).toHaveBeenCalledWith(EXTERNAL);
    expect(images.getFileBlob).not.toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("still opens a tab when a direct fetch is blocked", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await download()(EXTERNAL, "brochure.pdf");

    expect(openSpy).toHaveBeenCalledWith(EXTERNAL, "_blank", "noopener");
  });

  it("reports a refused response", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404, blob: async () => new Blob([""]) });

    await download()(EXTERNAL, "brochure.pdf");

    expect(toast.showToast).toHaveBeenCalledWith(expect.stringMatching(/no longer available/i), "error");
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
