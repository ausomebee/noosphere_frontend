import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const post = vi.hoisted(() => vi.fn());
const AxiosInterceptor = vi.hoisted(() => vi.fn(() => ({ post })));
vi.mock("../Helper/AxiosInterceptor", () => ({ default: AxiosInterceptor }));

import ImageUpload from "../api/ImageUpload";

/**
 * The single-purpose client for the image upload endpoint.
 *
 * Its whole job is to flatten two very different shapes into one: the backend's
 * success envelope, and whatever an axios rejection happens to carry. Callers
 * (the profile page, FileUploadArea) branch only on `success` and read `data`
 * unconditionally, so neither field may ever come back undefined -- which is
 * what the defaults below exist to guarantee.
 */

const formData = { append: () => {} };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploading an image", () => {
  it("posts the form data as multipart with the caller's tokens", async () => {
    post.mockResolvedValue({ data: { success: true, data: [{ url: "https://cdn/a.png" }] } });
    await ImageUpload.UploadImage({ formData, accessToken: "at", refreshToken: "rt" });

    expect(AxiosInterceptor).toHaveBeenCalledWith("at", "rt");
    const [url, body, options] = post.mock.calls[0];
    expect(url).toContain("/images/client/upload");
    expect(body).toBe(formData);
    expect(options.headers["Content-Type"]).toBe("multipart/form-data");
  });

  it("returns the uploaded files on success", async () => {
    post.mockResolvedValue({ data: { success: true, data: [{ url: "https://cdn/a.png" }] } });
    await expect(ImageUpload.UploadImage({ formData })).resolves.toEqual({
      success: true,
      data: [{ url: "https://cdn/a.png" }],
      error: null,
    });
  });

  it("substitutes an empty list when the response names no files", async () => {
    post.mockResolvedValue({ data: { success: true } });
    const result = await ImageUpload.UploadImage({ formData });
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("passes on an error the server reported alongside a 200", async () => {
    post.mockResolvedValue({ data: { success: false, error: "unsupported format" } });
    await expect(ImageUpload.UploadImage({ formData })).resolves.toEqual({
      success: false,
      data: [],
      error: "unsupported format",
    });
  });

  it("reports the reason a rejected request gave", async () => {
    post.mockRejectedValue({ response: { data: { error: "file too large" } } });
    await expect(ImageUpload.UploadImage({ formData })).resolves.toEqual({
      success: false,
      error: "file too large",
      data: [],
    });
  });

  it("falls back to a generic reason when the rejection carries none", async () => {
    post.mockRejectedValue(new Error("Network Error"));
    await expect(ImageUpload.UploadImage({ formData })).resolves.toEqual({
      success: false,
      error: "Image upload failed",
      data: [],
    });
  });

  it("falls back to a generic reason when the error body has no error field", async () => {
    post.mockRejectedValue({ response: { data: {} } });
    const result = await ImageUpload.UploadImage({ formData });
    expect(result.error).toBe("Image upload failed");
  });

  it("never throws, so a caller can branch on success alone", async () => {
    post.mockRejectedValue("a bare string, not an error");
    const result = await ImageUpload.UploadImage({ formData });
    expect(result.success).toBe(false);
  });
});
