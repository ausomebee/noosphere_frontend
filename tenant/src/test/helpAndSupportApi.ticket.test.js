import { describe, it, expect, vi, beforeEach } from "vitest";

const verbs = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock("../Helper/AxiosInterceptor", () => ({ default: () => verbs }));

import api from "../api/helpAndSupportApi";

/**
 * Raising a support ticket -- the one wrapper in helpAndSupportApi that builds a
 * request body rather than just forwarding arguments.
 *
 * The ticket goes out as multipart because it can carry screenshots, so the
 * body has to be inspected through FormData rather than compared as an object:
 * `getAll` is the only way to see repeated `attachment` entries. Category is
 * optional and is left out of the form entirely when the user picked none,
 * which is not the same as sending an empty string. The remaining wrappers'
 * success and error arms are covered by helpAndSupportApi.generated.test.js;
 * what is left here is this body and its error arm.
 */

const tokens = { accessToken: "at", refreshToken: "rt" };

const ticket = (over = {}) => ({
  tenantId: "t1",
  title: "Cannot open the scheduler",
  description: "It spins forever after login.",
  ...over,
  ...tokens,
});

const formOf = () => verbs.post.mock.calls[0][1];

// A stand-in for a picked file; jsdom's File is enough for FormData.
const file = (name) => new File(["x"], name, { type: "image/png" });

beforeEach(() => {
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe("the ticket body", () => {
  it("always carries the tenant, title and description", async () => {
    verbs.post.mockResolvedValue({ data: { id: "i1" } });
    await api.CreateHelpAndSupportTicket(ticket());
    const form = formOf();
    expect(form.get("tenantId")).toBe("t1");
    expect(form.get("title")).toBe("Cannot open the scheduler");
    expect(form.get("description")).toBe("It spins forever after login.");
  });

  it("includes the category when the user picked one", async () => {
    verbs.post.mockResolvedValue({ data: {} });
    await api.CreateHelpAndSupportTicket(ticket({ category: "Payment" }));
    expect(formOf().get("category")).toBe("Payment");
  });

  it("leaves the category out entirely when none was picked", async () => {
    verbs.post.mockResolvedValue({ data: {} });
    await api.CreateHelpAndSupportTicket(ticket());
    expect(formOf().has("category")).toBe(false);
  });

  it("appends every attachment under the same field name", async () => {
    verbs.post.mockResolvedValue({ data: {} });
    await api.CreateHelpAndSupportTicket(
      ticket({ attachment: [file("one.png"), file("two.png")] }),
    );
    expect(formOf().getAll("attachment").map((f) => f.name)).toEqual([
      "one.png",
      "two.png",
    ]);
  });

  it("sends no attachment field when the picker was left empty", async () => {
    verbs.post.mockResolvedValue({ data: {} });
    await api.CreateHelpAndSupportTicket(ticket({ attachment: [] }));
    expect(formOf().has("attachment")).toBe(false);
  });

  it("sends no attachment field when the caller passed nothing", async () => {
    verbs.post.mockResolvedValue({ data: {} });
    await api.CreateHelpAndSupportTicket(ticket());
    expect(formOf().has("attachment")).toBe(false);
  });

  it("sets no content type of its own, so axios can add the boundary", async () => {
    verbs.post.mockResolvedValue({ data: {} });
    await api.CreateHelpAndSupportTicket(ticket());
    expect(verbs.post.mock.calls[0][2]).toBeUndefined();
  });

  it("returns the created ticket", async () => {
    verbs.post.mockResolvedValue({ data: { id: "i1", status: "Not Started" } });
    await expect(api.CreateHelpAndSupportTicket(ticket())).resolves.toEqual({
      id: "i1",
      status: "Not Started",
    });
  });
});

describe("failing to raise a ticket", () => {
  it("surfaces the thrown error's own message, not the response body", async () => {
    // This wrapper reads error.message, so an axios error surfaces as
    // "Request failed with status code 500" rather than the backend's copy.
    verbs.post.mockRejectedValue(
      Object.assign(new Error("Network Error"), {
        response: { data: { message: "attachment too large" } },
      }),
    );
    await expect(api.CreateHelpAndSupportTicket(ticket())).rejects.toThrow("Network Error");
  });

  it("falls back to its own copy when the failure carries no message", async () => {
    verbs.post.mockRejectedValue({});
    await expect(api.CreateHelpAndSupportTicket(ticket())).rejects.toThrow(
      "Create Help and Support ticket failed",
    );
  });
});
