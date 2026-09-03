import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Reading a stored document back out of the private bucket.
 *
 * The three states this has to survive are the three states the AWS side can be
 * in: the API is still handing out unsigned links (nothing works, and we must
 * say so rather than fail blankly); the API signs links but the bucket has no
 * CORS rule (`fetch` is refused although the link is good, so a tab is the
 * right answer); and everything is in place (the file saves). Each is covered
 * below, along with the HTTP refusals that look alike but mean different things.
 */

import {
  isUnsignedStorageUrl,
  downloadDocumentFile,
  DOCUMENT_UNAVAILABLE,
  DOCUMENT_GONE,
  DOCUMENT_FAILED,
} from "../Helper/documentAccess";

const BUCKET = "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage";
const UNSIGNED = `${BUCKET}/1764605574756-grok_report.pdf`;
const SIGNED = `${UNSIGNED}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123&X-Amz-Expires=300`;

describe("isUnsignedStorageUrl", () => {
  it("recognises a path-style bucket link with no signature", () => {
    expect(isUnsignedStorageUrl(UNSIGNED)).toBe(true);
  });

  it("recognises a virtual-hosted link with no signature", () => {
    expect(
      isUnsignedStorageUrl(
        "https://ausomebee-objects-storage.s3.us-west-1.amazonaws.com/report.pdf"
      )
    ).toBe(true);
  });

  it("recognises the older dash-style regional endpoint", () => {
    expect(
      isUnsignedStorageUrl("https://s3-us-west-1.amazonaws.com/bucket/report.pdf")
    ).toBe(true);
  });

  it("accepts a link carrying a SigV4 signature", () => {
    expect(isUnsignedStorageUrl(SIGNED)).toBe(false);
  });

  it("accepts a link carrying an older SigV2 signature", () => {
    expect(
      isUnsignedStorageUrl(`${UNSIGNED}?AWSAccessKeyId=AKIA&Signature=xyz`)
    ).toBe(false);
  });

  // Our own endpoints authenticate with a header, so they have no signature to
  // find and must never be mistaken for a broken bucket link.
  it("ignores our own API's URLs", () => {
    expect(
      isUnsignedStorageUrl("https://api.noospherehub.com/api/v1/issue/attachment/7")
    ).toBe(false);
  });

  // Sits on amazonaws.com but is not object storage: matching a substring
  // rather than a whole label would wrongly condemn it.
  it("ignores a non-storage amazonaws host", () => {
    expect(
      isUnsignedStorageUrl(
        "http://ec2-54-153-58-76.us-west-1.compute.amazonaws.com:5000/file.pdf"
      )
    ).toBe(false);
  });

  it.each([
    ["an empty string", ""],
    ["whitespace", "   "],
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["unparseable text", "not a url at all ::::"],
  ])("returns false for %s", (_label, value) => {
    expect(isUnsignedStorageUrl(value)).toBe(false);
  });
});

describe("downloadDocumentFile", () => {
  let clickSpy;
  let openSpy;

  beforeEach(() => {
    global.fetch = vi.fn();
    // jsdom implements neither of these.
    URL.createObjectURL = vi.fn(() => "blob:generated");
    URL.revokeObjectURL = vi.fn();
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
  });

  it("saves the file when the request succeeds", async () => {
    const blob = new Blob(["pdf bytes"]);
    global.fetch.mockResolvedValue({ ok: true, status: 200, blob: async () => blob });

    await downloadDocumentFile(SIGNED, "grok_report.pdf");

    expect(global.fetch).toHaveBeenCalledWith(SIGNED);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    // The blob URL is released again, or every download leaks one.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:generated");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("names the saved file, and falls back to a generic name", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(["x"]),
    });
    const names = [];
    clickSpy.mockImplementation(function () {
      names.push(this.download);
    });

    await downloadDocumentFile(SIGNED, "payslip.pdf");
    await downloadDocumentFile(SIGNED, "");

    expect(names).toEqual(["payslip.pdf", "document"]);
  });

  // The state before the API change lands: refuse up front, spending no round
  // trip on a request that cannot succeed.
  it("refuses an unsigned link without calling fetch", async () => {
    await expect(downloadDocumentFile(UNSIGNED, "a.pdf")).rejects.toThrow(
      DOCUMENT_UNAVAILABLE
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each([[""], [null], [undefined]])(
    "refuses a missing url (%s) without calling fetch",
    async (value) => {
      await expect(downloadDocumentFile(value, "a.pdf")).rejects.toThrow(
        DOCUMENT_UNAVAILABLE
      );
      expect(global.fetch).not.toHaveBeenCalled();
    }
  );

  // The state where the API signs links but the bucket has no CORS rule: fetch
  // is refused, yet the link itself works, so the browser can still open it.
  it("opens a signed link in a tab when fetch is refused outright", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(downloadDocumentFile(SIGNED, "a.pdf")).resolves.toBeUndefined();

    expect(openSpy).toHaveBeenCalledWith(SIGNED, "_blank", "noopener");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it.each([
    [403, DOCUMENT_UNAVAILABLE],
    [404, DOCUMENT_GONE],
    [500, DOCUMENT_FAILED],
    [418, DOCUMENT_FAILED],
  ])("reports a %i without saving anything", async (status, message) => {
    global.fetch.mockResolvedValue({
      ok: false,
      status,
      blob: async () => new Blob(["<Error>AccessDenied</Error>"]),
    });

    await expect(downloadDocumentFile(SIGNED, "a.pdf")).rejects.toThrow(message);

    // The old code saved the error body as though it were the document.
    expect(clickSpy).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    // A refused response is not rescued by a tab; only a blocked fetch is.
    expect(openSpy).not.toHaveBeenCalled();
  });
});
