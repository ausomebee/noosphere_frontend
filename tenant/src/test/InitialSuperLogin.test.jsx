import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { AdminLogin } from "../ReduxStore/features/authentication";

/**
 * The super-admin's first sign-in, reached from the credentials mailed out with
 * a new tenant. Two fields and a login dispatch; the interesting part is the
 * routing table that follows it.
 *
 * A user who has not finished 2FA enrolment is sent to set a password. One who
 * has is routed on the method they picked, and a method the screen does not
 * recognise -- including none at all -- is treated as an error rather than
 * silently letting the login through.
 *
 * `dispatch` is mocked so each test can hand the screen the exact result action
 * it should route on; the store is still real because `loading` for the button
 * comes off the auth slice. The unknown-method and unexpected-error paths both
 * log, so console.error is silenced.
 */

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

const dispatch = vi.hoisted(() => vi.fn());
vi.mock("react-redux", async (importOriginal) => ({
  ...(await importOriginal()),
  useDispatch: () => dispatch,
}));

import InitialSuperLogin from "../Pages/Authentication/AuthOnboarding/SuperAdmin/InitialSuperLogin";

const CREDENTIALS = { email: "olivia@therapyco.com", password: "sup3rsecret" };

const loggedInAs = (user) => ({
  type: AdminLogin.fulfilled.type,
  payload: { data: { id: "u-1", tenantId: "t-1", accessToken: "at", ...user } },
});
const refusedWith = (payload) => ({ type: AdminLogin.rejected.type, payload });

const makeStore = (loading = false) =>
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
    <Provider store={makeStore(loading)}>
      <InitialSuperLogin />
    </Provider>
  );

const emailBox = () => screen.getByPlaceholderText("Enter your mail");
const passwordBox = () => screen.getByPlaceholderText("Enter your Password");
const continueButton = () => screen.getByRole("button", { name: "Continue" });

const fillCredentials = ({ email, password } = CREDENTIALS) => {
  fireEvent.change(emailBox(), { target: { value: email } });
  fireEvent.change(passwordBox(), { target: { value: password } });
};

const signIn = async (credentials) => {
  fillCredentials(credentials);
  fireEvent.click(continueButton());
  await waitFor(() => expect(dispatch).toHaveBeenCalled());
};

beforeEach(() => {
  vi.clearAllMocks();
  dispatch.mockResolvedValue(loggedInAs({ auth2FADone: false }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the sign-in form", () => {
  it("opens on two empty fields", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Welcome to NooSphere" })).toBeInTheDocument();
    expect(emailBox()).toHaveValue("");
    expect(passwordBox()).toHaveValue("");
  });

  it("shows the button as busy while the slice reports a login in flight", () => {
    renderPage({ loading: true });
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });

  it("refuses to dispatch with both fields blank", async () => {
    renderPage();
    fireEvent.click(continueButton());
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("refuses an address that is not an email", async () => {
    renderPage();
    fillCredentials({ email: "olivia@", password: "sup3rsecret" });
    fireEvent.click(continueButton());
    expect(await screen.findByText("Invalid email")).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("refuses a password shorter than six characters", async () => {
    renderPage();
    fillCredentials({ email: CREDENTIALS.email, password: "abc" });
    fireEvent.click(continueButton());
    expect(
      await screen.findByText("Password must be at least 6 characters")
    ).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches the typed credentials once both fields pass", async () => {
    renderPage();
    await signIn();
    expect(toast).toHaveBeenCalledWith("Login successful", "success");
  });
});

describe("where a successful login lands", () => {
  it("sends a user who has not finished 2FA enrolment to set a password", async () => {
    dispatch.mockResolvedValue(loggedInAs({ auth2FADone: false }));
    renderPage();
    await signIn();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/auth/change-password"));
  });

  it("sends an authenticator user to the app challenge", async () => {
    dispatch.mockResolvedValue(
      loggedInAs({ auth2FADone: true, authType: "AUTHENTICATOR" })
    );
    renderPage();
    await signIn();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/login-authenticator")
    );
  });

  it("sends a security-question user to the question challenge", async () => {
    dispatch.mockResolvedValue(
      loggedInAs({ auth2FADone: true, authType: "SECRETMESSAGE" })
    );
    renderPage();
    await signIn();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/login-question")
    );
  });

  // An enrolled user whose method the screen does not recognise is stopped
  // rather than let through unchallenged.
  it("refuses to route an enrolled user with an unrecognised method", async () => {
    dispatch.mockResolvedValue(loggedInAs({ auth2FADone: true, authType: "SMS" }));
    renderPage();
    await signIn();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Unknown authentication type", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("refuses to route an enrolled user with no method at all", async () => {
    dispatch.mockResolvedValue(loggedInAs({ auth2FADone: true }));
    renderPage();
    await signIn();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Unknown authentication type", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("a login that does not succeed", () => {
  it("surfaces the message the thunk rejected with", async () => {
    dispatch.mockResolvedValue(refusedWith({ message: "Those details are wrong" }));
    renderPage();
    await signIn();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Those details are wrong", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the rejection carries no payload", async () => {
    dispatch.mockResolvedValue(refusedWith(undefined));
    renderPage();
    await signIn();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Login failed", "error"));
  });

  it("falls back to a generic message when the payload has no message", async () => {
    dispatch.mockResolvedValue(refusedWith({ status: 401 }));
    renderPage();
    await signIn();
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Login failed", "error"));
  });

  // A dispatch that throws outright -- rather than resolving to a rejected
  // action -- is caught separately so the screen never dies mid-login.
  it("catches a dispatch that throws outright", async () => {
    dispatch.mockRejectedValue(new Error("network down"));
    renderPage();
    await signIn();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "An unexpected error occurred. Please try again.",
        "error"
      )
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
