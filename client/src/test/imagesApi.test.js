import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Exchanging a stored object key for a signed link.
 *
 * Each portal reads through the route for its own role -- the bucket is
 * private and the API decides whether this caller may see this object -- so
 * the path is asserted here rather than taken on trust.
 */

const authFetch = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: vi.fn(() => authFetch),
}));

import AxiosInterceptor from "../Helper/AxiosInterceptor";
import imagesApi from "../api/imagesApi";

const PATH = `${import.meta.env.VITE_API_URL}/images/client/presigned-url`;

const call = (over = {}) =>
  imagesApi.GetPresignedUrl({
    key: "1699999999-photo.png",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    ...over,
  });

beforeEach(() => {
  vi.clearAllMocks();
  authFetch.get.mockResolvedValue({
    data: { url: "https://signed/x?X-Amz-Signature=a" },
  });
});

describe("GetPresignedUrl", () => {
  it("asks this portal's own route, with the key and an expiry", async () => {
    await call();
    expect(authFetch.get).toHaveBeenCalledWith(PATH, {
      params: { key: "1699999999-photo.png", expiresIn: 1800 },
    });
  });

  it("signs the request with the caller's tokens", async () => {
    await call();
    expect(AxiosInterceptor).toHaveBeenCalledWith("access-1", "refresh-1");
  });

  it("returns the signed url", async () => {
    await expect(call()).resolves.toBe("https://signed/x?X-Amz-Signature=a");
  });

  // The documented envelope, verbatim from the API.
  it("reads the url out of { success, data: { key, url, expiresIn } }", async () => {
    authFetch.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          key: "1784261531993-pmf-go-live-checklist-v2.docx",
          url: "https://signed/bare",
          expiresIn: 1800,
        },
      },
    });
    await expect(call()).resolves.toBe("https://signed/bare");
  });

  it("also accepts a bare { url }, so an envelope change is survivable", async () => {
    authFetch.get.mockResolvedValue({ data: { url: "https://signed/bare" } });
    await expect(call()).resolves.toBe("https://signed/bare");
  });

  it.each([
    ["a bare string", "https://signed/bare"],
    ["{ presignedUrl }", { presignedUrl: "https://signed/bare" }],
  ])("resolves null for %s, which the API does not send", async (_label, body) => {
    authFetch.get.mockResolvedValue({ data: body });
    await expect(call()).resolves.toBeNull();
  });

  it("resolves null when the body carries no url at all", async () => {
    authFetch.get.mockResolvedValue({ data: { ok: true } });
    await expect(call()).resolves.toBeNull();
  });

  // A refusal has to surface: the caller tells "denied" from "no url" by it.
  it("rejects when the request fails", async () => {
    authFetch.get.mockRejectedValue(new Error("403"));
    await expect(call()).rejects.toThrow("403");
  });

  it.each([
    ["a caller's own value", 60, 60],
    ["past the one-week ceiling", 999999999, 604800],
    ["zero", 0, 1800],
    ["a negative", -5, 1800],
    ["nonsense", "soon", 1800],
  ])("clamps %s", async (_label, given, expected) => {
    await call({ expiresIn: given });
    expect(authFetch.get.mock.calls[0][1].params.expiresIn).toBe(expected);
  });
});

describe("GetPdfPreviewUrl", () => {
  const PDF_PATH = `${import.meta.env.VITE_API_URL}/images/client/pdf-preview`;

  const askPdf = () =>
    imagesApi.GetPdfPreviewUrl({
      key: "1699999999-notes.docx",
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });

  it("asks this portal's own conversion route with the key", async () => {
    authFetch.get.mockResolvedValue({ data: { data: { url: "https://signed/a.pdf" } } });
    await askPdf();
    expect(authFetch.get).toHaveBeenCalledWith(PDF_PATH, {
      params: { key: "1699999999-notes.docx" },
    });
  });

  it("returns the converted PDF's url", async () => {
    authFetch.get.mockResolvedValue({ data: { data: { url: "https://signed/a.pdf" } } });
    await expect(askPdf()).resolves.toBe("https://signed/a.pdf");
  });

  // Nothing converted yet: the caller falls back to rendering in the browser.
  it("resolves null when the body carries no url", async () => {
    authFetch.get.mockResolvedValue({ data: { success: true, data: {} } });
    await expect(askPdf()).resolves.toBeNull();
  });

  it("rejects when the route is absent, which the caller treats as no preview", async () => {
    authFetch.get.mockRejectedValue(new Error("404"));
    await expect(askPdf()).rejects.toThrow("404");
  });
});
