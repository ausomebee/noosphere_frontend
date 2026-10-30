import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "react-toastify";
import { showToast } from "../Helper/ShowToast";

vi.mock("react-toastify", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe("showToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls toast.success for success type", () => {
    showToast("Saved!", "success");
    expect(toast.success).toHaveBeenCalledWith("Saved!", expect.any(Object));
  });

  it("calls toast.error for error type", () => {
    showToast("Failed!", "error");
    expect(toast.error).toHaveBeenCalledWith("Failed!", expect.any(Object));
  });

  it("calls default toast for default type", () => {
    showToast("Info message");
    expect(toast).toHaveBeenCalledWith("Info message", expect.any(Object));
  });

  it("handles object parameter format", () => {
    showToast({ message: "Object msg", type: "success" });
    expect(toast.success).toHaveBeenCalledWith("Object msg", expect.any(Object));
  });

  it("handles object without type", () => {
    showToast({ message: "No type" });
    expect(toast).toHaveBeenCalledWith("No type", expect.any(Object));
  });

  it("handles empty message", () => {
    showToast("", "success");
    expect(toast.success).toHaveBeenCalledWith("", expect.any(Object));
  });

  it("handles null message gracefully", () => {
    showToast(null);
    expect(toast).toHaveBeenCalledWith("", expect.any(Object));
  });

  it("uses top-center position", () => {
    showToast("Test", "success");
    expect(toast.success).toHaveBeenCalledWith("Test", expect.objectContaining({
      position: "top-center",
    }));
  });

  it("dismisses existing toasts before showing new one", () => {
    showToast("New toast", "success");
    expect(toast.dismiss).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it("passes toastId to prevent duplicates", () => {
    showToast("Duplicate check", "error");
    expect(toast.error).toHaveBeenCalledWith("Duplicate check", expect.objectContaining({
      toastId: "error-Duplicate check",
    }));
  });
});
