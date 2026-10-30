import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The organisation-wide 2FA choice a super admin makes during onboarding: a
 * switch that decides whether the method is forced on everyone, and a pair of
 * radios choosing between an authenticator app and a security question.
 *
 * The form's three flat fields are expanded into three booleans on the way out
 * — the chosen method becomes two mutually exclusive flags, and the switch
 * becomes `setForAll` — so the payload is asserted rather than just the call.
 * The chosen method also decides where the screen goes next, since the super
 * admin immediately enrols in whatever they picked.
 *
 * The `tenantId` on the auth slice is sent as `userId`, which is why the store
 * is real. The radio labels carry no `htmlFor`, so the inputs are clicked
 * directly. Both failure arms log, so console.error is silenced.
 */

const api = vi.hoisted(() => ({ SuperAdminChoices: vi.fn() }));
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

import SuperAdmin2FAChoice from "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperAdmin2FAChoice";

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

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <SuperAdmin2FAChoice />
    </Provider>
  );

const enableSwitch = () =>
  document.body.querySelector(".settings-item input[type='checkbox']");
const radios = () =>
  Array.from(document.body.querySelectorAll(".radio-group input[type='radio']"));
const authenticatorRadio = () => radios()[0];
const questionRadio = () => radios()[1];
const continueButton = () => screen.getByRole("button", { name: "Continue" });

const submit = () => fireEvent.click(continueButton());

const payload = () => api.SuperAdminChoices.mock.calls[0][0];

beforeEach(() => {
  vi.clearAllMocks();
  api.SuperAdminChoices.mockResolvedValue({ data: { message: "Saved" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the choice form", () => {
  it("opens with the switch on and the authenticator preselected", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Two-Factor Authentication (2FA) Settings" })
    ).toBeInTheDocument();
    expect(enableSwitch()).toBeChecked();
    expect(authenticatorRadio()).toBeChecked();
    expect(questionRadio()).not.toBeChecked();
  });

  it("moves the choice to the security question", () => {
    renderPage();
    fireEvent.click(questionRadio());
    expect(questionRadio()).toBeChecked();
    expect(authenticatorRadio()).not.toBeChecked();
  });

  it("turns the organisation-wide switch off", () => {
    renderPage();
    fireEvent.click(enableSwitch());
    expect(enableSwitch()).not.toBeChecked();
  });
});

describe("saving the choice", () => {
  it("sends the authenticator as two flags plus the tenant", async () => {
    renderPage();
    submit();
    await waitFor(() => expect(api.SuperAdminChoices).toHaveBeenCalled());
    expect(payload()).toEqual({
      Authenticator2FA: true,
      securityQuestion: false,
      setForAll: true,
      tenantId: "t-1",
    });
  });

  it("sends the security question as the mirrored pair of flags", async () => {
    renderPage();
    fireEvent.click(questionRadio());
    submit();
    await waitFor(() => expect(api.SuperAdminChoices).toHaveBeenCalled());
    expect(payload()).toMatchObject({
      Authenticator2FA: false,
      securityQuestion: true,
    });
  });

  it("sends the switch through as setForAll when it is turned off", async () => {
    renderPage();
    fireEvent.click(enableSwitch());
    submit();
    await waitFor(() => expect(api.SuperAdminChoices).toHaveBeenCalled());
    expect(payload()).toMatchObject({ setForAll: false });
  });

  it("shows the server's own confirmation message", async () => {
    api.SuperAdminChoices.mockResolvedValue({
      data: { message: "Organisation 2FA is now enforced" },
    });
    renderPage();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Organisation 2FA is now enforced", "success")
    );
  });

  it("falls back to a generic confirmation when the response carries none", async () => {
    api.SuperAdminChoices.mockResolvedValue({ data: {} });
    renderPage();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("2FA settings saved successfully!", "success")
    );
  });

  it("falls back to a generic confirmation when there is no response body at all", async () => {
    api.SuperAdminChoices.mockResolvedValue(undefined);
    renderPage();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("2FA settings saved successfully!", "success")
    );
  });
});

describe("where the choice leads", () => {
  it("sends an authenticator choice on to the QR enrolment", async () => {
    renderPage();
    submit();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/authenticator")
    );
  });

  it("sends a security-question choice on to the question setup", async () => {
    renderPage();
    fireEvent.click(questionRadio());
    submit();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/auth/2fa/security-question")
    );
  });

  it("goes nowhere when the save is refused", async () => {
    api.SuperAdminChoices.mockRejectedValue(new Error("500"));
    renderPage();
    submit();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), "error"));
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("a save that fails", () => {
  it("surfaces the server's own message", async () => {
    api.SuperAdminChoices.mockRejectedValue({
      response: { data: { message: "This tenant is already configured" } },
    });
    renderPage();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("This tenant is already configured", "error")
    );
  });

  it("falls back to a generic message when the rejection carries none", async () => {
    api.SuperAdminChoices.mockRejectedValue(new Error("network down"));
    renderPage();
    submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Failed to update 2FA settings.", "error")
    );
  });

  it("locks the button while the save is in flight and releases it after", async () => {
    let release;
    api.SuperAdminChoices.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderPage();
    submit();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled()
    );
    release({ data: { message: "Saved" } });
    await waitFor(() => expect(continueButton()).not.toBeDisabled());
  });
});
