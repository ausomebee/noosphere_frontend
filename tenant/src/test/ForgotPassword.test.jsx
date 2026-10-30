import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The forgot-password screen: one email field, one call, and a link back to the
 * login page. It keeps its own `errorMessage` alongside react-hook-form's field
 * errors, so a failed request and an invalid address surface through two
 * separate paragraphs that can both be on screen at once.
 *
 * The API is only trusted when it answers with the exact string "Reset link
 * sent to email"; any other successful response is turned into a thrown error
 * and lands on the failure path, which is why the happy-path mock returns that
 * literal. The failure path also logs, so console.error is silenced.
 */

const api = vi.hoisted(() => ({ AdminForgetPassword: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import ForgetPassword from "../Pages/Authentication/ForgotPassword/ForgotPassword";

const emailBox = () => screen.getByPlaceholderText("olivia@therapyco.com");
const continueButton = () => screen.getByRole("button", { name: "Continue" });
const errorTexts = () =>
  Array.from(document.body.querySelectorAll("p.error-message")).map((p) => p.textContent);

const typeEmail = (value) => {
  fireEvent.change(emailBox(), { target: { value } });
  fireEvent.blur(emailBox());
};

const submit = () => fireEvent.click(continueButton());

beforeEach(() => {
  vi.clearAllMocks();
  api.AdminForgetPassword.mockResolvedValue({
    data: { message: "Reset link sent to email" },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the screen", () => {
  it("opens on an empty email field", () => {
    render(<ForgetPassword />);
    expect(screen.getByRole("heading", { name: "Forgot Password" })).toBeInTheDocument();
    expect(emailBox()).toHaveValue("");
    expect(errorTexts()).toEqual([]);
  });

  it("sends the user back to the login page from the remember link", () => {
    render(<ForgetPassword />);
    fireEvent.click(screen.getByText("Remember Password?"));
    expect(navigate).toHaveBeenCalledWith("/");
  });
});

describe("validating the address", () => {
  it("refuses a blank email", async () => {
    render(<ForgetPassword />);
    submit();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(api.AdminForgetPassword).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Email is required", "error");
  });

  it("refuses an address that is not an email", async () => {
    render(<ForgetPassword />);
    typeEmail("olivia@");
    submit();
    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeInTheDocument();
    expect(api.AdminForgetPassword).not.toHaveBeenCalled();
  });

  it("marks the field as errored while it is invalid", async () => {
    render(<ForgetPassword />);
    submit();
    await screen.findByText("Email is required");
    expect(emailBox().className).toContain("input-error");
  });

  it("clears the error once a real address is typed", async () => {
    render(<ForgetPassword />);
    submit();
    await screen.findByText("Email is required");
    typeEmail("olivia@therapyco.com");
    await waitFor(() => expect(screen.queryByText("Email is required")).toBeNull());
    expect(emailBox().className).not.toContain("input-error");
  });
});

describe("requesting the reset", () => {
  it("sends the typed address and confirms with a toast", async () => {
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() => expect(api.AdminForgetPassword).toHaveBeenCalled());
    expect(api.AdminForgetPassword).toHaveBeenCalledWith({
      email: "olivia@therapyco.com",
    });
    expect(toast).toHaveBeenCalledWith(
      "Password reset email sent successfully!",
      "success"
    );
    expect(errorTexts()).toEqual([]);
  });

  // The screen deliberately does not navigate on success -- the user has to go
  // and read their mail, so the form stays where it is.
  it("stays on the screen after a successful request", async () => {
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() => expect(api.AdminForgetPassword).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
    expect(emailBox()).toHaveValue("olivia@therapyco.com");
  });

  // Anything but the expected confirmation string is treated as a failure,
  // even on an HTTP 200.
  it("treats an unexpected success message as a failure", async () => {
    api.AdminForgetPassword.mockResolvedValue({ data: { message: "queued" } });
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() =>
      expect(errorTexts()).toContain("Failed to send password reset email.")
    );
    expect(toast).toHaveBeenCalledWith("Failed to send password reset email.", "error");
  });

  it("surfaces the server's own message when the call is rejected", async () => {
    api.AdminForgetPassword.mockRejectedValue({
      response: { data: { message: "No account for that address" } },
    });
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() => expect(errorTexts()).toContain("No account for that address"));
    expect(toast).toHaveBeenCalledWith("No account for that address", "error");
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.AdminForgetPassword.mockRejectedValue(new Error("network down"));
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() =>
      expect(errorTexts()).toContain("Failed to send password reset email.")
    );
  });

  // The request error is cleared at the start of the next attempt, so a retry
  // that works does not leave the old message under the field.
  it("clears the previous failure when the request is retried", async () => {
    api.AdminForgetPassword.mockRejectedValueOnce(new Error("network down"));
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() =>
      expect(errorTexts()).toContain("Failed to send password reset email.")
    );
    submit();
    await waitFor(() => expect(errorTexts()).toEqual([]));
    expect(api.AdminForgetPassword).toHaveBeenCalledTimes(2);
  });

  it("locks the button while the request is in flight and releases it after", async () => {
    let release;
    api.AdminForgetPassword.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    render(<ForgetPassword />);
    typeEmail("olivia@therapyco.com");
    submit();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled()
    );
    release({ data: { message: "Reset link sent to email" } });
    await waitFor(() => expect(continueButton()).not.toBeDisabled());
  });
});
