import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * The "set a new password" step of the forgot-password flow.
 *
 * Saving the password is the easy half; the hard half is the six-way routing
 * decision that follows. Two independent facts -- whether the tenant makes 2FA
 * mandatory for everyone, and whether this user has already enrolled -- combine
 * with the user's chosen 2FA method to decide between *enrolling* in 2FA,
 * *verifying* against an existing enrolment, going straight to login, or doing
 * nothing at all. Every one of those exits is asserted here, including the
 * silent one, along with the navigation state each carries (the verify routes
 * thread the role through so the failure card can address the right audience).
 *
 * Nothing is signed in on this screen, so there is no redux store: the user id
 * comes from the route and everything else from the save response.
 */

const api = vi.hoisted(() => ({
  AdminSetPassword: vi.fn(),
  GetSuperAdminChoices: vi.fn(),
}));
vi.mock("../api/authApis", () => ({ default: api }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const routing = vi.hoisted(() => ({ navigate: vi.fn(), params: { userId: "u-1" } }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => routing.navigate,
  useParams: () => routing.params,
}));

import ForgotPasswordResetPassword from "../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword";

const PASSWORD = "Passw0rd!";

const field = (id) => document.body.querySelector(`#${id}`);

const fill = (password = PASSWORD, confirm = password) => {
  fireEvent.change(field("newPassword"), { target: { value: password } });
  fireEvent.change(field("confirmPassword"), { target: { value: confirm } });
};

const submitForm = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

// One saved password under a given tenant policy and user record, waited out to
// the point where the routing decision has been taken.
const saveUnder = async ({ setForAll, user, message }) => {
  api.GetSuperAdminChoices.mockResolvedValue({ data: { data: { setForAll } } });
  api.AdminSetPassword.mockResolvedValue({
    data: { message, data: { tenantId: "t-1", ...user } },
  });
  render(<ForgotPasswordResetPassword />);
  fill();
  submitForm();
  await waitFor(() => expect(api.GetSuperAdminChoices).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  routing.params = { userId: "u-1" };
  api.GetSuperAdminChoices.mockResolvedValue({ data: { data: { setForAll: false } } });
  api.AdminSetPassword.mockResolvedValue({
    data: { data: { tenantId: "t-1", auth2FADone: false } },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validating the new password", () => {
  it("refuses an empty form", async () => {
    render(<ForgotPasswordResetPassword />);
    submitForm();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(api.AdminSetPassword).not.toHaveBeenCalled();
  });

  it("names the strength rule the new password breaks", async () => {
    render(<ForgotPasswordResetPassword />);
    fill("short1!");
    submitForm();
    await waitFor(() => expect(field("newPassword")).toHaveClass("input-error"));
    expect(document.body.querySelector("p.error-message")).toHaveTextContent(
      "At least 8 characters"
    );
    expect(api.AdminSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match", async () => {
    render(<ForgotPasswordResetPassword />);
    fill(PASSWORD, "Different1!");
    submitForm();
    await waitFor(() =>
      expect(field("confirmPassword")).toHaveClass("input-error")
    );
    expect(screen.getByText("Passwords must match")).toBeInTheDocument();
  });

  it("sends the new password against the user id in the route", async () => {
    routing.params = { userId: "u-99" };
    await saveUnder({ setForAll: false, user: { auth2FADone: false } });
    expect(api.AdminSetPassword).toHaveBeenCalledWith({
      id: "u-99",
      password: PASSWORD,
    });
  });
});

describe("confirming the save", () => {
  it("shows the message the endpoint returned", async () => {
    await saveUnder({
      setForAll: false,
      user: { auth2FADone: false },
      message: "Your password is set",
    });
    expect(toast).toHaveBeenCalledWith("Your password is set", "success");
  });

  it("falls back to its own wording when the endpoint returned none", async () => {
    await saveUnder({ setForAll: false, user: { auth2FADone: false } });
    expect(toast).toHaveBeenCalledWith("Password updated successfully!", "success");
  });

  it("looks the tenant policy up by the tenant on the saved user", async () => {
    await saveUnder({ setForAll: false, user: { auth2FADone: false } });
    expect(api.GetSuperAdminChoices).toHaveBeenCalledWith({ id: "t-1" });
  });
});

describe("routing a user who has not enrolled in 2FA yet", () => {
  it("sends them to authenticator enrolment", async () => {
    await saveUnder({
      setForAll: true,
      user: { auth2FADone: false, authType: "AUTHENTICATOR" },
    });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith("/auth/2fa/authenticator", {
        state: { userId: "u-1" },
      })
    );
  });

  it("sends them to security-question enrolment with the question in hand", async () => {
    await saveUnder({
      setForAll: true,
      user: {
        auth2FADone: false,
        authType: "SECRETMESSAGE",
        authQuestion: "First pet?",
      },
    });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith(
        "/auth/2fa/security-question",
        { state: { userId: "u-1", authQuestion: "First pet?" } }
      )
    );
  });

  it("complains when enrolment is mandatory but no method is recorded", async () => {
    await saveUnder({ setForAll: true, user: { auth2FADone: false } });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Unknown authentication type", "error")
    );
    expect(routing.navigate).not.toHaveBeenCalled();
  });

  it("goes straight to login when the tenant does not mandate 2FA", async () => {
    await saveUnder({
      setForAll: false,
      user: { auth2FADone: false, authType: "AUTHENTICATOR" },
    });
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/"));
  });
});

describe("routing a user who is already enrolled", () => {
  it("sends them to the authenticator check with their role attached", async () => {
    await saveUnder({
      setForAll: true,
      user: { auth2FADone: true, authType: "AUTHENTICATOR", role: { name: "Admin" } },
    });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith(
        "/auth/forgot-password/2fa-auth-verify",
        { state: { userId: "u-1", role: { name: "Admin" } } }
      )
    );
  });

  it("sends them to the security-question check with question and role", async () => {
    await saveUnder({
      setForAll: true,
      user: {
        auth2FADone: true,
        authType: "SECRETMESSAGE",
        authQuestion: "First pet?",
        role: "Owner",
      },
    });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith(
        "/auth/forgot-password/2fa-question-verify",
        { state: { userId: "u-1", authQuestion: "First pet?", role: "Owner" } }
      )
    );
  });

  it("complains when the enrolment records no method", async () => {
    await saveUnder({ setForAll: true, user: { auth2FADone: true } });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Unknown authentication type", "error")
    );
    expect(routing.navigate).not.toHaveBeenCalled();
  });

  it("leaves an already-enrolled user where they are when 2FA is optional", async () => {
    await saveUnder({
      setForAll: false,
      user: { auth2FADone: true, authType: "AUTHENTICATOR" },
    });
    // Deliberately no fourth branch: the screen simply stops.
    expect(routing.navigate).not.toHaveBeenCalled();
    expect(screen.getByText("Set a new Password")).toBeInTheDocument();
  });
});

describe("when something goes wrong", () => {
  it("treats an unreadable tenant policy as 2FA being optional", async () => {
    api.GetSuperAdminChoices.mockRejectedValue(new Error("policy service down"));
    api.AdminSetPassword.mockResolvedValue({
      data: { data: { tenantId: "t-1", auth2FADone: false } },
    });
    render(<ForgotPasswordResetPassword />);
    fill();
    submitForm();
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/"));
  });

  it("shows the message a refused save returned", async () => {
    api.AdminSetPassword.mockRejectedValue({
      response: { data: { message: "Reset link expired" } },
    });
    render(<ForgotPasswordResetPassword />);
    fill();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Reset link expired", "error")
    );
    expect(api.GetSuperAdminChoices).not.toHaveBeenCalled();
  });

  it("falls back to generic copy when the failure carried no message", async () => {
    api.AdminSetPassword.mockRejectedValue(new Error("socket hang up"));
    render(<ForgotPasswordResetPassword />);
    fill();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Failed to update password.", "error")
    );
  });

  it("re-enables the submit button once the save settles", async () => {
    api.AdminSetPassword.mockRejectedValue(new Error("socket hang up"));
    render(<ForgotPasswordResetPassword />);
    fill();
    submitForm();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
    );
  });
});

describe("the strength and match indicators", () => {
  it("scores the new password as it is typed", () => {
    render(<ForgotPasswordResetPassword />);
    fireEvent.input(field("newPassword"), { target: { value: "abc" } });
    expect(screen.getByText("Weak password")).toBeInTheDocument();
  });

  it("compares the confirmation against whatever the password field holds", () => {
    render(<ForgotPasswordResetPassword />);
    fireEvent.change(field("newPassword"), { target: { value: PASSWORD } });
    fireEvent.input(field("confirmPassword"), { target: { value: PASSWORD } });
    expect(screen.getByText(/Passwords match/i)).toBeInTheDocument();
  });
});
