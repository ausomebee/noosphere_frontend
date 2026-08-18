import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../Helper/ShowToast", () => ({ showToast: vi.fn() }));

import { showToast } from "../Helper/ShowToast";
import { showValidationErrors } from "../Helper/formErrors";

describe("showValidationErrors", () => {
  beforeEach(() => vi.clearAllMocks());

  const lastMessage = () => showToast.mock.calls.at(-1)?.[0];

  it("shows a single field's message as-is", () => {
    showValidationErrors({ name: { message: "Name is required", ref: {} } });
    expect(lastMessage()).toBe("Name is required");
    expect(showToast.mock.calls.at(-1)?.[1]).toBe("error");
  });

  it("prefixes a count when several fields fail", () => {
    showValidationErrors({
      name: { message: "Name is required" },
      email: { message: "Email is invalid" },
    });
    expect(lastMessage()).toBe("2 fields need attention: Name is required");
  });

  it("reaches into nested schema errors", () => {
    // A yup object schema nests: the parent key carries no message of its own,
    // which is what made the previous first-value lookup fall back to generic.
    showValidationErrors({ pricing: { pricePerMonth: { message: "Price is required" } } });
    expect(lastMessage()).toBe("Price is required");
  });

  it("reaches into field-array errors", () => {
    showValidationErrors({ service: [{ units: { message: "Units must be greater than 0" } }] });
    expect(lastMessage()).toBe("Units must be greater than 0");
  });

  it("ignores the ref node so DOM internals never leak into the toast", () => {
    const ref = { name: "input", message: "should never be shown" };
    showValidationErrors({ title: { message: "Title is required", ref } });
    expect(lastMessage()).toBe("Title is required");
  });

  it("falls back when a container holds no message", () => {
    showValidationErrors({ service: { ref: {}, type: "required" } });
    expect(lastMessage()).toBe("Please fill in all required fields");
  });

  it("falls back on an empty or missing error object", () => {
    showValidationErrors({});
    expect(lastMessage()).toBe("Please fill in all required fields");
    showValidationErrors(undefined);
    expect(lastMessage()).toBe("Please fill in all required fields");
  });

  it("skips blank messages rather than showing an empty toast", () => {
    showValidationErrors({ a: { message: "   " }, b: { message: "Real problem" } });
    expect(lastMessage()).toBe("Real problem");
  });
});
