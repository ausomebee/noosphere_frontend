import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  OnboardAdmin,
} from "../ReduxStore/features/authentication";

/**
 * The invited-admin password screen: it reads the user id and the (URL encoded)
 * email out of the route, sets a password, and then decides where the new admin
 * lands next.
 *
 * That routing decision is the whole point of the file. After onboarding
 * succeeds the page asks the tenant's super admin what 2FA policy is in force
 * and turns two independent booleans into one of four destinations -- the
 * authenticator setup, the security-question setup, the app root, or an error
 * toast when the policy says "everyone must enrol" but names no method.
 *
 * `dispatch` is mocked rather than the API behind the thunk, so each test can
 * hand the component the exact result action it wants to route on; the store is
 * still real because `useAuth` reads the auth slice for the button's spinner.
 */

const api = vi.hoisted(() => ({ GetSuperAdminChoices: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...args) => toast(...args),
  showApiError: vi.fn(),
}));

const routing = vi.hoisted(() => ({ navigate: vi.fn(), params: {} }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => routing.navigate,
  useParams: () => routing.params,
}));

const dispatch = vi.hoisted(() => vi.fn());
vi.mock("react-redux", async (importOriginal) => ({
  ...(await importOriginal()),
  useDispatch: () => dispatch,
}));

import AdminOnboarding from "../Pages/Authentication/AuthOnboarding/Admin/AdminOnboarding";

const PASSWORD = "Passw0rd!";

// `.match()` only reads `type`, so a plain object is enough and keeps each
// test's payload obvious.
const fulfilledWith = (user) => ({
  type: OnboardAdmin.fulfilled.type,
  payload: { data: user },
});
const rejectedWith = (payload) => ({
  type: OnboardAdmin.rejected.type,
  payload,
});

const store = (loading = false) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: false,
        loading,
        error: null,
        token: null,
        user: null,
      },
    },
  });

const renderPage = ({ loading } = {}) =>
  render(
    <Provider store={store(loading)}>
      <AdminOnboarding />
    </Provider>
  );

const field = (id) => document.body.querySelector(`#${id}`);

const fillPasswords = (password = PASSWORD, confirm = password) => {
  fireEvent.change(field("password"), { target: { value: password } });
  fireEvent.change(field("confirmPassword"), { target: { value: confirm } });
};

const submitForm = () =>
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

// Runs a whole successful onboarding under one 2FA policy and waits for the
// routing decision to have been taken.
const onboardUnder = async ({ choices, user = {} }) => {
  api.GetSuperAdminChoices.mockResolvedValue({ data: { data: choices } });
  dispatch.mockResolvedValue(fulfilledWith({ tenantId: "t-1", ...user }));
  renderPage();
  fillPasswords();
  submitForm();
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith("Onboarding successful", "success")
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  routing.params = { userId: "u-1", email: encodeURIComponent("olivia@therapyco.com") };
  api.GetSuperAdminChoices.mockResolvedValue({
    data: { data: { setForAll: false, Authenticator2FA: false, securityQuestion: false } },
  });
  dispatch.mockResolvedValue(fulfilledWith({ tenantId: "t-1" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the email carried in the route", () => {
  it("decodes the address the invitation link encoded", () => {
    routing.params = { userId: "u-1", email: encodeURIComponent("o+admin@therapyco.com") };
    renderPage();
    expect(field("email")).toHaveValue("o+admin@therapyco.com");
  });

  it("leaves the field blank when the link carries no address", () => {
    routing.params = { userId: "u-1" };
    renderPage();
    expect(field("email")).toHaveValue("");
  });

  it("keeps the address read-only", () => {
    renderPage();
    expect(field("email")).toHaveAttribute("readonly");
  });
});

describe("password validation", () => {
  it("refuses a submission with no password at all", async () => {
    renderPage();
    submitForm();
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
    expect(toast.mock.calls[0][0]).toMatch(/fields need attention|is required/);
  });

  it("holds the confirm field to the same strength rules and to a match", async () => {
    renderPage();
    fillPasswords(PASSWORD, "Different1!");
    submitForm();
    expect(await screen.findByText("Passwords must match")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("names the rule a weak password breaks", async () => {
    renderPage();
    fillPasswords("weak");
    submitForm();
    // The same wording also appears in the strength checklist, so this looks
    // specifically at the schema's inline error paragraph.
    await waitFor(() => expect(field("password")).toHaveClass("input-error"));
    expect(document.body.querySelector("p.auth-error-message")).toHaveTextContent(
      "At least 8 characters"
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("where a newly onboarded admin lands", () => {
  it("sends them to authenticator setup when that is the tenant-wide method", async () => {
    await onboardUnder({
      choices: { setForAll: true, Authenticator2FA: true, securityQuestion: false },
      user: { auth2FADone: false },
    });
    expect(api.GetSuperAdminChoices).toHaveBeenCalledWith({ id: "t-1" });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
  });

  it("prefers the authenticator when the tenant enabled both methods", async () => {
    await onboardUnder({
      choices: { setForAll: true, Authenticator2FA: true, securityQuestion: true },
      user: { auth2FADone: false },
    });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
  });

  it("sends them to the security question when that is the only method", async () => {
    await onboardUnder({
      choices: { setForAll: true, Authenticator2FA: false, securityQuestion: true },
      user: { auth2FADone: false },
    });
    await waitFor(() =>
      expect(routing.navigate).toHaveBeenCalledWith("/auth/2fa/security-question")
    );
  });

  it("complains when 2FA is mandatory but no method is enabled", async () => {
    await onboardUnder({
      choices: { setForAll: true, Authenticator2FA: false, securityQuestion: false },
      user: { auth2FADone: false },
    });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Unknown authentication type", "error")
    );
    expect(routing.navigate).not.toHaveBeenCalled();
  });

  it("goes straight to the app when the admin has already enrolled", async () => {
    await onboardUnder({
      choices: { setForAll: true, Authenticator2FA: true, securityQuestion: false },
      user: { auth2FADone: true },
    });
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/"));
  });

  it("goes straight to the app when the tenant does not mandate 2FA", async () => {
    await onboardUnder({
      choices: { setForAll: false, Authenticator2FA: true, securityQuestion: false },
      user: { auth2FADone: false },
    });
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/"));
  });

  it("treats an unreadable 2FA policy as no policy and lets them in", async () => {
    api.GetSuperAdminChoices.mockRejectedValue(new Error("choices are down"));
    dispatch.mockResolvedValue(fulfilledWith({ tenantId: "t-1", auth2FADone: false }));
    renderPage();
    fillPasswords();
    submitForm();
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/"));
  });
});

describe("a refused onboarding", () => {
  it("shows the message the rejection carried", async () => {
    dispatch.mockResolvedValue(rejectedWith({ message: "Invitation expired" }));
    renderPage();
    fillPasswords();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Invitation expired", "error")
    );
    expect(routing.navigate).not.toHaveBeenCalled();
  });

  it("falls back to generic copy when the rejection carried none", async () => {
    dispatch.mockResolvedValue(rejectedWith(undefined));
    renderPage();
    fillPasswords();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Onboarding failed", "error")
    );
  });

  it("catches a dispatch that throws outright", async () => {
    dispatch.mockRejectedValue(new Error("network down"));
    renderPage();
    fillPasswords();
    submitForm();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "An unexpected error occurred. Please try again.",
        "error"
      )
    );
  });
});

describe("the rest of the screen", () => {
  it("spins the submit button while the auth slice is loading", () => {
    renderPage({ loading: true });
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });

  it("offers a way back to the login screen", () => {
    renderPage();
    fireEvent.click(screen.getByText("Login"));
    expect(routing.navigate).toHaveBeenCalledWith("/");
  });

  it("shows the password strength checklist as the rules are met", () => {
    renderPage();
    fireEvent.input(field("password"), { target: { value: "Passw0rd!" } });
    expect(screen.getByText("Strong password")).toBeInTheDocument();
  });
});
