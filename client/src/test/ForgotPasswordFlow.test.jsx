import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const authApi = vi.hoisted(() => ({
  ClientForgetPassword: vi.fn(),
  ClientSetPassword: vi.fn(),
}));
vi.mock("../api/authApis", () => ({ default: authApi }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

import ForgotPassword from "../Pages/Authentication/ForgotPassword/ForgotPassword";
import CheckEmail from "../Pages/Authentication/ForgotPassword/CheckEmail";
import ChangePassword from "../Pages/Authentication/ForgotPassword/ChangePassword";

/**
 * The three pages a client walks through after forgetting their password:
 * ask for a reset, wait for the email, then choose a new password.
 *
 * They pass state to each other through the router rather than through redux --
 * the address is carried in the navigation state to the confirmation page, and
 * the tenant link id arrives as a route parameter on the final page -- so each
 * one has to be mounted inside a router that supplies the right piece.
 *
 * The confirmation page keeps its own 45-second rate limit on resending, held
 * in component state with no timer behind it, so the second attempt in a test
 * is always the throttled one.
 */

// `input` rather than `change`: PasswordInput mirrors uncontrolled values off
// the native input event, and a bare change event never reaches that handler.
const type = (placeholder, value) =>
  fireEvent.input(screen.getByPlaceholderText(placeholder), { target: { value } });

const submit = (name) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });

beforeEach(() => {
  vi.clearAllMocks();
  // Every failure path logs; the console output is noise, not behaviour.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("asking for a reset link", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

  it("offers a way back to the login page", () => {
    renderPage();
    expect(screen.getByText("← Back to Login").closest("a")).toHaveAttribute("href", "/");
  });

  it("refuses a blank address", async () => {
    renderPage();
    await submit("Reset password");
    expect(showToast).toHaveBeenCalledWith("Email is required", "error");
    expect(authApi.ClientForgetPassword).not.toHaveBeenCalled();
  });

  it("never gets as far as sending an ill-formed address", async () => {
    renderPage();
    type("Enter your email", "not-an-email");
    await submit("Reset password");
    // The field is a native email input, so the browser blocks the submit
    // before react-hook-form's schema is consulted -- no request, and no
    // toast either, because the form's own handler never runs.
    expect(authApi.ClientForgetPassword).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows the validation failure beside the field as well", async () => {
    renderPage();
    await submit("Reset password");
    // Once inside TextInput, once in the form's own error line beneath it.
    await waitFor(() => expect(screen.getAllByText("Email is required")).toHaveLength(2));
  });

  it("sends the request and moves on, carrying the address", async () => {
    authApi.ClientForgetPassword.mockResolvedValue({
      data: { message: "email sent successfully" },
    });
    renderPage();
    type("Enter your email", "ada@example.com");
    await submit("Reset password");

    expect(authApi.ClientForgetPassword).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(showToast).toHaveBeenCalledWith("Password reset email sent successfully!", "success");
    expect(navigate).toHaveBeenCalledWith("/checkEmail", {
      state: { email: "ada@example.com" },
    });
  });

  it("stays put when the API answers with anything else", async () => {
    authApi.ClientForgetPassword.mockResolvedValue({ data: { message: "unknown email" } });
    renderPage();
    type("Enter your email", "ada@example.com");
    await submit("Reset password");

    expect(showToast).toHaveBeenCalledWith("Failed to initiate password reset.", "error");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports the reason the server gave", async () => {
    authApi.ClientForgetPassword.mockRejectedValue({
      response: { data: { message: "too many attempts" } },
    });
    renderPage();
    type("Enter your email", "ada@example.com");
    await submit("Reset password");
    expect(showToast).toHaveBeenCalledWith("too many attempts", "error");
  });

  it("reports a thrown error that carries only a message", async () => {
    authApi.ClientForgetPassword.mockRejectedValue(new Error("network down"));
    renderPage();
    type("Enter your email", "ada@example.com");
    await submit("Reset password");
    expect(showToast).toHaveBeenCalledWith("network down", "error");
  });

  it("reports a failure that says nothing at all", async () => {
    authApi.ClientForgetPassword.mockRejectedValue({});
    renderPage();
    type("Enter your email", "ada@example.com");
    await submit("Reset password");
    expect(showToast).toHaveBeenCalledWith(
      "Failed to send reset email. Please try again.",
      "error"
    );
  });

  it("holds the button while the request is in flight, then releases it", async () => {
    let settle;
    authApi.ClientForgetPassword.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      })
    );
    renderPage();
    type("Enter your email", "ada@example.com");
    await submit("Reset password");
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();

    await act(async () => {
      settle({ data: { message: "email sent successfully" } });
    });
    expect(screen.getByRole("button", { name: "Reset password" })).not.toBeDisabled();
  });
});

describe("waiting for the reset email", () => {
  const renderPage = (state) =>
    render(
      <MemoryRouter initialEntries={[{ pathname: "/checkEmail", state }]}>
        <CheckEmail />
      </MemoryRouter>
    );

  const resend = () =>
    act(async () => {
      fireEvent.click(document.body.querySelector("p button"));
    });

  it("names the address the email went to", () => {
    renderPage({ email: "ada@example.com" });
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("says 'your email' when it was not told which one", () => {
    renderPage(undefined);
    expect(screen.getByText("your email")).toBeInTheDocument();
  });

  it("refuses to resend without an address", async () => {
    renderPage(undefined);
    await resend();
    expect(showToast).toHaveBeenCalledWith(
      "No email found. Please go back and try again.",
      "error"
    );
    expect(authApi.ClientForgetPassword).not.toHaveBeenCalled();
  });

  it("resends to the address it was given", async () => {
    authApi.ClientForgetPassword.mockResolvedValue({ data: {} });
    renderPage({ email: "ada@example.com" });
    await resend();
    expect(authApi.ClientForgetPassword).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(showToast).toHaveBeenCalledWith("Reset email resent successfully!", "success");
  });

  it("throttles a second attempt straight after the first", async () => {
    authApi.ClientForgetPassword.mockResolvedValue({ data: {} });
    renderPage({ email: "ada@example.com" });
    await resend();
    await resend();

    expect(authApi.ClientForgetPassword).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("Please wait a moment before resending", "info");
  });

  it("does not start the throttle when the resend failed", async () => {
    authApi.ClientForgetPassword.mockRejectedValue({});
    renderPage({ email: "ada@example.com" });
    await resend();
    await resend();
    expect(authApi.ClientForgetPassword).toHaveBeenCalledTimes(2);
  });

  it("reports the reason the server gave", async () => {
    authApi.ClientForgetPassword.mockRejectedValue({
      response: { data: { message: "mailbox full" } },
    });
    renderPage({ email: "ada@example.com" });
    await resend();
    expect(showToast).toHaveBeenCalledWith("mailbox full", "error");
  });

  it("reports a failure that says nothing at all", async () => {
    authApi.ClientForgetPassword.mockRejectedValue(new Error("boom"));
    renderPage({ email: "ada@example.com" });
    await resend();
    expect(showToast).toHaveBeenCalledWith(
      "Failed to resend email. Please try again later.",
      "error"
    );
  });

  it("swaps the link for a spinner while the resend is in flight", async () => {
    let settle;
    authApi.ClientForgetPassword.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      })
    );
    renderPage({ email: "ada@example.com" });
    await resend();

    const button = document.body.querySelector("p button");
    expect(button).toBeDisabled();
    expect(button.querySelector(".spinner")).toBeTruthy();

    await act(async () => {
      settle({ data: {} });
    });
    expect(document.body.querySelector("p button")).not.toBeDisabled();
    expect(screen.getByText("Resend it")).toBeInTheDocument();
  });
});

describe("choosing a new password", () => {
  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={["/changePassword/tc1"]}>
        <Routes>
          <Route path="/changePassword/:clientTenantId" element={<ChangePassword />} />
        </Routes>
      </MemoryRouter>
    );

  const fill = (password, confirmPassword) => {
    type("Enter Password", password);
    type("Confirm Password", confirmPassword);
  };

  it("refuses a blank form", async () => {
    renderPage();
    await submit("Continue");
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("Password is required"),
      "error"
    );
    expect(authApi.ClientSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a password that breaks the strength rules", async () => {
    renderPage();
    fill("weakpass", "weakpass");
    await submit("Continue");
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("One uppercase letter"),
      "error"
    );
    expect(authApi.ClientSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match", async () => {
    renderPage();
    fill("StrongPass1!", "StrongPass2!");
    await submit("Continue");
    expect(showToast).toHaveBeenCalledWith("Passwords must match", "error");
    expect(authApi.ClientSetPassword).not.toHaveBeenCalled();
  });

  it("sets the password against the tenant link in the url", async () => {
    authApi.ClientSetPassword.mockResolvedValue({ data: { message: "all set" } });
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await submit("Continue");

    expect(authApi.ClientSetPassword).toHaveBeenCalledWith({
      clientTenantId: "tc1",
      password: "StrongPass1!",
    });
    expect(showToast).toHaveBeenCalledWith("all set", "success");
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("confirms in its own words when the server sends no message", async () => {
    authApi.ClientSetPassword.mockResolvedValue({ data: {} });
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await submit("Continue");
    expect(showToast).toHaveBeenCalledWith("Password updated successfully!", "success");
  });

  it("stays put when the server rejects the change", async () => {
    authApi.ClientSetPassword.mockRejectedValue(new Error("expired link"));
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await submit("Continue");

    expect(showToast).toHaveBeenCalledWith(
      "Failed to reset password. Please try again.",
      "error"
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("grades the password as it is typed", async () => {
    renderPage();
    type("Enter Password", "abc");
    await waitFor(() => expect(screen.getByText("Weak password")).toBeInTheDocument());

    type("Enter Password", "StrongPass1!");
    await waitFor(() => expect(screen.getByText("Strong password")).toBeInTheDocument());
  });

  it("confirms the two entries agree", async () => {
    renderPage();
    fill("StrongPass1!", "StrongPass1!");
    await waitFor(() => expect(screen.getByText("✓ Passwords match")).toBeInTheDocument());
  });

  it("points out a mismatch once the confirmation is left", async () => {
    renderPage();
    fill("StrongPass1!", "StrongPass2!");
    fireEvent.blur(screen.getByPlaceholderText("Confirm Password"));
    await waitFor(() =>
      expect(screen.getByText("✕ Passwords do not match")).toBeInTheDocument()
    );
  });
});
