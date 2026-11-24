import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The forced password change a super admin goes through before anything else:
 * a new password with a strength checklist and a confirm field held to the
 * same rules, then a hand-off to the organisation's 2FA settings.
 *
 * Both fields carry the same placeholder, so they are addressed positionally.
 * The confirm field is not merely compared against the first -- it runs the
 * full strength schema itself -- so a weak password reports against both
 * fields at once, which is why the error assertions count matches rather than
 * expecting one.
 *
 * There is no email link on a first login, so the request goes out as the
 * first-login call, which authorises itself with the signed-in session. The
 * user id comes off the auth slice, so the store is real. The failure path logs, so console.error is silenced.
 */

const api = vi.hoisted(() => ({ AdminFirstLoginSetPassword: vi.fn() }));
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

import SuperChangePassword from "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperChangePassword";

const STRONG = "Str0ng!Pass";

const makeStore = () =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "u-1", tenantId: "t-1", accessToken: "at", refreshToken: "rt" },
      },
    },
  });

let store;
const renderPage = () => {
  store = makeStore();
  return render(
    <Provider store={store}>
      <SuperChangePassword />
    </Provider>
  );
};

const passwordBoxes = () => screen.getAllByPlaceholderText("Enter your password");
const newPasswordBox = () => passwordBoxes()[0];
const confirmBox = () => passwordBoxes()[1];
const continueButton = () => screen.getByRole("button", { name: "Continue" });

const fill = ({ password = STRONG, confirm = STRONG } = {}) => {
  fireEvent.change(newPasswordBox(), { target: { value: password } });
  fireEvent.change(confirmBox(), { target: { value: confirm } });
};

const submit = () => fireEvent.click(continueButton());

beforeEach(() => {
  vi.clearAllMocks();
  api.AdminFirstLoginSetPassword.mockResolvedValue({ data: { message: "Password updated" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the screen", () => {
  it("opens on two empty password fields", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Change your password" })).toBeInTheDocument();
    expect(passwordBoxes()).toHaveLength(2);
    expect(newPasswordBox()).toHaveValue("");
    expect(confirmBox()).toHaveValue("");
  });
});

describe("validating the new password", () => {
  it("refuses two blank fields", async () => {
    renderPage();
    submit();
    expect(await screen.findByText("New password is required")).toBeInTheDocument();
    expect(screen.getByText("Confirm password is required")).toBeInTheDocument();
    expect(api.AdminFirstLoginSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a password that is too short", async () => {
    renderPage();
    fill({ password: "Ab1!", confirm: "Ab1!" });
    submit();
    await waitFor(() => expect(screen.getAllByText("At least 8 characters").length).toBe(2));
    expect(api.AdminFirstLoginSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a password with no special character", async () => {
    renderPage();
    fill({ password: "Str0ngPass", confirm: "Str0ngPass" });
    submit();
    await waitFor(() => expect(screen.getAllByText("One special character").length).toBe(2));
    expect(api.AdminFirstLoginSetPassword).not.toHaveBeenCalled();
  });

  // The confirm field runs the strength rules itself, so a strong password
  // paired with a weak confirmation is rejected on the confirm field's own
  // rules before the match is ever considered.
  it("refuses a confirmation that does not match", async () => {
    renderPage();
    fill({ password: STRONG, confirm: "Different1!" });
    submit();
    expect(await screen.findByText("Passwords must match")).toBeInTheDocument();
    expect(api.AdminFirstLoginSetPassword).not.toHaveBeenCalled();
  });

  it("refuses a weak confirmation of a strong password", async () => {
    renderPage();
    fill({ password: STRONG, confirm: "abc" });
    submit();
    // Several rules fail at once here and yup reports whichever it reaches
    // first, so the assertion is that the confirm field is complaining at all.
    await waitFor(() =>
      expect(document.body.querySelectorAll(".auth-error-message").length).toBeGreaterThan(0)
    );
    expect(api.AdminFirstLoginSetPassword).not.toHaveBeenCalled();
  });
});

describe("setting the password", () => {
  it("sends the new password against the signed-in user", async () => {
    renderPage();
    fill();
    submit();
    await waitFor(() => expect(api.AdminFirstLoginSetPassword).toHaveBeenCalled());
    expect(api.AdminFirstLoginSetPassword).toHaveBeenCalledWith({
      id: "u-1",
      password: STRONG,
    });
  });

  it("shows the server's own confirmation and moves on to 2FA settings", async () => {
    api.AdminFirstLoginSetPassword.mockResolvedValue({
      data: { message: "Password changed, please continue" },
    });
    renderPage();
    fill();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Password changed, please continue", "success")
    );
    expect(navigate).toHaveBeenCalledWith("/auth/2fa-settings");
  });

  it("keeps a 2FA token the response hands back for the 2FA setup", async () => {
    api.AdminFirstLoginSetPassword.mockResolvedValue({
      data: { message: "ok", data: { twoFactorToken: "2fa-next" } },
    });
    renderPage();
    fill();
    submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/auth/2fa-settings"));
    expect(store.getState().authentication.twoFactorToken).toBe("2fa-next");
    expect(store.getState().authentication.twoFactorUserId).toBe("u-1");
  });

  it("falls back to a generic confirmation when the response carries none", async () => {
    api.AdminFirstLoginSetPassword.mockResolvedValue({ data: {} });
    renderPage();
    fill();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Password updated successfully!", "success")
    );
  });

  it("falls back to a generic confirmation when there is no response body at all", async () => {
    api.AdminFirstLoginSetPassword.mockResolvedValue(undefined);
    renderPage();
    fill();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Password updated successfully!", "success")
    );
  });
});

describe("a request that fails", () => {
  it("surfaces the server's own message and stays put", async () => {
    api.AdminFirstLoginSetPassword.mockRejectedValue({
      response: { data: { message: "That password was used before" } },
    });
    renderPage();
    fill();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("That password was used before", "error")
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.AdminFirstLoginSetPassword.mockRejectedValue(new Error("network down"));
    renderPage();
    fill();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Failed to update password.", "error")
    );
  });

  it("locks the button while the request is in flight and releases it after", async () => {
    let release;
    api.AdminFirstLoginSetPassword.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    fill();
    submit();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled()
    );
    release({ data: { message: "Password updated" } });
    await waitFor(() => expect(continueButton()).not.toBeDisabled());
  });
});
