import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Settings > General page: three fetches on mount (the format settings, the
 * tenant's 2FA choices and the tenant record for its email), three little
 * "Change" modals over the format rows, a change-password modal and the 2FA
 * switch with a settings modal per authentication method.
 *
 * Everything here is the real component -- the modals, the react-select pickers
 * and the password rules -- because the page is mostly wiring between them and
 * a probe would test nothing. Only the API and the toast helper are mocked.
 *
 * Each format picker is a react-select rather than a native select, so the tests
 * type into it to narrow the menu and press Enter; only one modal is ever open,
 * so a single unqualified lookup finds the right one.
 */

const api = vi.hoisted(() => ({
  GetGeneralSettingsByTenantId: vi.fn(),
  GetTenantAdminChoices: vi.fn(),
  GetTenantById: vi.fn(),
  CreateGeneralSettings: vi.fn(),
  UpdateGeneralSettings: vi.fn(),
  ChangePassword: vi.fn(),
  Set2FASetDefault: vi.fn(),
  SetTenantAdminEnabled: vi.fn(),
}));
vi.mock("../api/generalSettingsApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

import GeneralSettings from "../Pages/Settings/SettingsSubs/GeneralSettings";

const store = ({ permissions, tenantId = "tenant-1", email = "owner@example.com" } = {}) =>
  configureStore({
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId,
          email,
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "SETTINGS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

let currentStore;

const renderPage = (opts) => {
  currentStore = store(opts);
  return render(
    <Provider store={currentStore}>
      <GeneralSettings />
    </Provider>
  );
};

const rowValue = (label) =>
  Array.from(document.body.querySelectorAll(".settings-row"))
    .find((row) => row.querySelector(".settings-row-label")?.textContent === label)
    ?.querySelector(".settings-row-value").textContent;

const changeButtons = () => screen.getAllByRole("button", { name: "Change" });
const modal = () => screen.getByRole("dialog");
const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));
const twoFactorSwitch = () => document.body.querySelector(".switch input");

// react-select: typing narrows the menu so Enter lands on the intended option.
const chooseOption = (query) => {
  const input = document.body.querySelector(".input-select input");
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
};

const settled = () =>
  waitFor(() => expect(api.GetTenantById).toHaveBeenCalled());

beforeEach(() => {
  vi.clearAllMocks();
  api.GetGeneralSettingsByTenantId.mockResolvedValue({
    data: { dateFormat: "DD/MM/YYYY", timeFormat: "24-hour", currency: "GBP" },
  });
  api.GetTenantAdminChoices.mockResolvedValue({
    data: { isEnabled: false, securityQuestion: true, Authenticator2FA: false },
  });
  api.GetTenantById.mockResolvedValue({ data: { email: "tenant@example.com" } });
  api.CreateGeneralSettings.mockResolvedValue({});
  api.UpdateGeneralSettings.mockResolvedValue({});
  api.ChangePassword.mockResolvedValue({});
  api.Set2FASetDefault.mockResolvedValue({});
  api.SetTenantAdminEnabled.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the settings", () => {
  it("asks all three endpoints for this tenant", async () => {
    renderPage();
    await settled();
    const args = { tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" };
    expect(api.GetGeneralSettingsByTenantId).toHaveBeenCalledWith(args);
    expect(api.GetTenantAdminChoices).toHaveBeenCalledWith(args);
    expect(api.GetTenantById).toHaveBeenCalledWith(args);
  });

  it("fetches nothing at all until a tenant is known", async () => {
    renderPage({ tenantId: null });
    await waitFor(() => expect(screen.getByText("General Settings")).toBeInTheDocument());
    expect(api.GetGeneralSettingsByTenantId).not.toHaveBeenCalled();
    expect(api.GetTenantAdminChoices).not.toHaveBeenCalled();
    expect(api.GetTenantById).not.toHaveBeenCalled();
  });

  it("shows the stored formats, labelling the ones that have a label", async () => {
    renderPage();
    await waitFor(() => expect(rowValue("Date Format")).toBe("DD/MM/YYYY"));
    expect(rowValue("Time Format")).toBe("24-hour");
    expect(rowValue("Currency")).toBe("GBP (£)");
    expect(currentStore.getState().generalSettings).toMatchObject({
      dateFormat: "DD/MM/YYYY",
      currency: "GBP",
    });
  });

  it("shows an unrecognised stored value as it stands", async () => {
    api.GetGeneralSettingsByTenantId.mockResolvedValue({
      data: { currency: "JPY", timeFormat: "sundial" },
    });
    renderPage();
    await waitFor(() => expect(rowValue("Currency")).toBe("JPY"));
    expect(rowValue("Time Format")).toBe("sundial");
  });

  it("keeps its defaults for the fields the response omits", async () => {
    api.GetGeneralSettingsByTenantId.mockResolvedValue({ data: { currency: "EUR" } });
    renderPage();
    await waitFor(() => expect(rowValue("Currency")).toBe("EUR (€)"));
    expect(rowValue("Date Format")).toBe("MM/DD/YYYY");
    expect(rowValue("Time Format")).toBe("12-hour (AM/PM)");
  });

  it("keeps its defaults when the settings response is empty", async () => {
    api.GetGeneralSettingsByTenantId.mockResolvedValue({ data: null });
    renderPage();
    await settled();
    expect(rowValue("Date Format")).toBe("MM/DD/YYYY");
  });

  it("keeps its defaults when the settings fetch is refused", async () => {
    api.GetGeneralSettingsByTenantId.mockRejectedValue(new Error("500"));
    renderPage();
    await settled();
    expect(rowValue("Date Format")).toBe("MM/DD/YYYY");
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch general settings:",
      expect.any(Error)
    );
  });

  it("prefers the tenant's own email over the signed-in user's", async () => {
    renderPage();
    await waitFor(() => expect(rowValue("Email")).toBe("tenant@example.com"));
  });

  it("falls back to the signed-in user's email", async () => {
    api.GetTenantById.mockResolvedValue({ data: {} });
    renderPage();
    await waitFor(() => expect(rowValue("Email")).toBe("owner@example.com"));
  });

  it("says nothing is set when neither the tenant nor the user has an email", async () => {
    api.GetTenantById.mockResolvedValue({ data: {} });
    renderPage({ email: null });
    await waitFor(() => expect(rowValue("Email")).toBe("Not set"));
  });

  it("falls back to the user's email when the tenant fetch is refused", async () => {
    api.GetTenantById.mockRejectedValue(new Error("500"));
    renderPage();
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch tenant info:",
        expect.any(Error)
      )
    );
    expect(rowValue("Email")).toBe("owner@example.com");
  });
});

describe("changing a format", () => {
  it("saves a new date format over the existing settings record", async () => {
    renderPage();
    await settled();
    fireEvent.click(changeButtons()[0]);
    expect(modal()).toHaveTextContent("Change Date Format");
    chooseOption("YYYY-MM");
    save();
    await waitFor(() =>
      expect(api.UpdateGeneralSettings).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        dateFormat: "YYYY-MM-DD",
        timeFormat: "24-hour",
        currency: "GBP",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Settings updated successfully", "success");
    expect(rowValue("Date Format")).toBe("YYYY-MM-DD");
    expect(currentStore.getState().generalSettings.dateFormat).toBe("YYYY-MM-DD");
  });

  it("creates the settings record the first time, then updates it", async () => {
    api.GetGeneralSettingsByTenantId.mockResolvedValue({ data: null });
    renderPage();
    await settled();
    fireEvent.click(changeButtons()[1]);
    expect(modal()).toHaveTextContent("Change Time Format");
    chooseOption("24");
    save();
    await waitFor(() =>
      expect(api.CreateGeneralSettings).toHaveBeenCalledWith(
        expect.objectContaining({ timeFormat: "24-hour" })
      )
    );
    expect(api.UpdateGeneralSettings).not.toHaveBeenCalled();

    // The record now exists, so a second save must update rather than create.
    fireEvent.click(changeButtons()[1]);
    chooseOption("12");
    save();
    await waitFor(() =>
      expect(api.UpdateGeneralSettings).toHaveBeenCalledWith(
        expect.objectContaining({ timeFormat: "12-hour" })
      )
    );
  });

  it("saves a new currency", async () => {
    renderPage();
    await settled();
    fireEvent.click(changeButtons()[2]);
    expect(modal()).toHaveTextContent("Change Currency");
    chooseOption("NGN");
    save();
    await waitFor(() =>
      expect(api.UpdateGeneralSettings).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "NGN" })
      )
    );
    expect(rowValue("Currency")).toBe("NGN (₦)");
  });

  it("reports a refused save and leaves the row on the new value", async () => {
    api.UpdateGeneralSettings.mockRejectedValue(new Error("500"));
    renderPage();
    await settled();
    fireEvent.click(changeButtons()[0]);
    chooseOption("MMM");
    save();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to save settings", "error")
    );
  });

  it("keeps the stored format when the modal is cancelled", async () => {
    renderPage();
    await settled();
    fireEvent.click(changeButtons()[2]);
    chooseOption("EUR");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.UpdateGeneralSettings).not.toHaveBeenCalled();
    expect(rowValue("Currency")).toBe("GBP (£)");
  });

  it("hides the change links from a role that may not edit settings", async () => {
    renderPage({ permissions: ["view_general_settings", "edit_security_settings"] });
    await settled();
    // Only the password row keeps its Change link under this permission set.
    expect(changeButtons()).toHaveLength(1);
  });
});

describe("changing the password", () => {
  const openPasswordModal = async () => {
    renderPage();
    await settled();
    fireEvent.click(changeButtons()[3]);
    expect(modal()).toHaveTextContent("Change Password");
  };

  const type = (placeholder, value) =>
    fireEvent.change(screen.getByPlaceholderText(placeholder), {
      target: { value },
    });

  const fill = (current, next, confirm = next) => {
    type("Enter current password", current);
    type("Enter new password", next);
    type("Confirm new password", confirm);
  };

  it("refuses a half-filled form", async () => {
    await openPasswordModal();
    type("Enter current password", "   ");
    save();
    expect(toast.showToast).toHaveBeenCalledWith("Please fill in all fields", "error");
    expect(api.ChangePassword).not.toHaveBeenCalled();
  });

  it("names the first rule a weak password fails", async () => {
    await openPasswordModal();
    fill("old-pass", "short");
    save();
    expect(toast.showToast).toHaveBeenCalledWith(
      "Password must contain: At least 8 characters",
      "error"
    );
    expect(api.ChangePassword).not.toHaveBeenCalled();
  });

  it("refuses a confirmation that does not match", async () => {
    await openPasswordModal();
    fill("old-pass", "Str0ng!Pass", "Str0ng!Pas");
    save();
    expect(toast.showToast).toHaveBeenCalledWith(
      "New password and confirm password do not match",
      "error"
    );
    expect(api.ChangePassword).not.toHaveBeenCalled();
  });

  it("sends the change and closes on success", async () => {
    await openPasswordModal();
    fill("old-pass", "Str0ng!Pass");
    save();
    await waitFor(() =>
      expect(api.ChangePassword).toHaveBeenCalledWith({
        currentPassword: "old-pass",
        newPassword: "Str0ng!Pass",
        staffId: "user-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Password changed successfully", "success");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("hands a refused change to the shared error reporter", async () => {
    const failure = new Error("401");
    api.ChangePassword.mockRejectedValue(failure);
    await openPasswordModal();
    fill("old-pass", "Str0ng!Pass");
    save();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(failure, "CHANGE_PASSWORD")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears the fields it left behind when reopened", async () => {
    await openPasswordModal();
    fill("old-pass", "Str0ng!Pass");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(changeButtons()[3]);
    expect(screen.getByPlaceholderText("Enter current password")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter new password")).toHaveValue("");
  });
});

describe("the two-factor switch", () => {
  it("turns 2FA on and reveals the methods", async () => {
    renderPage();
    await settled();
    expect(document.body.querySelector(".settings-2fa-methods")).toBeNull();
    fireEvent.click(twoFactorSwitch());
    await waitFor(() =>
      expect(api.SetTenantAdminEnabled).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        isEnabled: true,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Two-factor authentication enabled",
      "success"
    );
    expect(document.body.querySelector(".settings-2fa-methods")).toBeInTheDocument();
  });

  it("turns 2FA off again", async () => {
    api.GetTenantAdminChoices.mockResolvedValue({ data: { isEnabled: true } });
    renderPage();
    await waitFor(() => expect(twoFactorSwitch()).toBeChecked());
    fireEvent.click(twoFactorSwitch());
    await waitFor(() =>
      expect(api.SetTenantAdminEnabled).toHaveBeenCalledWith(
        expect.objectContaining({ isEnabled: false })
      )
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Two-factor authentication disabled",
      "success"
    );
  });

  it("puts the switch back when the change is refused", async () => {
    const failure = new Error("500");
    api.SetTenantAdminEnabled.mockRejectedValue(failure);
    renderPage();
    await settled();
    fireEvent.click(twoFactorSwitch());
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(failure, "TOGGLE_2FA")
    );
    expect(twoFactorSwitch()).not.toBeChecked();
  });

  it("leaves the switch untouchable for a role that may not edit security", async () => {
    renderPage({ permissions: ["view_general_settings"] });
    await settled();
    expect(twoFactorSwitch()).toBeDisabled();
  });

  it("keeps its defaults when the choices response is empty", async () => {
    api.GetTenantAdminChoices.mockResolvedValue({ data: null });
    renderPage();
    await settled();
    expect(twoFactorSwitch()).not.toBeChecked();
  });

  it("keeps its defaults when the choices fetch is refused", async () => {
    api.GetTenantAdminChoices.mockRejectedValue(new Error("500"));
    renderPage();
    await settled();
    expect(console.error).toHaveBeenCalledWith(
      "Failed to fetch tenant admin choices:",
      expect.any(Error)
    );
    expect(twoFactorSwitch()).not.toBeChecked();
  });
});

describe("the authentication methods", () => {
  const enabled = (over = {}) =>
    api.GetTenantAdminChoices.mockResolvedValue({
      data: { isEnabled: true, securityQuestion: true, Authenticator2FA: false, ...over },
    });

  const gear = (name) =>
    Array.from(document.body.querySelectorAll(".settings-2fa-method-row"))
      .find((row) => row.textContent.startsWith(name))
      .querySelector(".settings-2fa-gear-btn");

  const badgedMethod = () =>
    document.body
      .querySelector(".settings-2fa-default-badge")
      ?.closest(".settings-2fa-method-row")
      ?.querySelector(".settings-2fa-method-name").textContent;

  const ready = async () => {
    renderPage();
    await waitFor(() =>
      expect(document.body.querySelector(".settings-2fa-methods")).toBeInTheDocument()
    );
  };

  it("badges whichever method the tenant has made default", async () => {
    enabled();
    await ready();
    expect(badgedMethod()).toBe("Security Question");
  });

  it("badges the authenticator app when that is the default", async () => {
    enabled({ securityQuestion: false, Authenticator2FA: true });
    await ready();
    expect(badgedMethod()).toBe("Authenticator App");
  });

  it("makes the authenticator app the default for everyone", async () => {
    enabled();
    await ready();
    fireEvent.click(gear("Authenticator App"));
    expect(modal()).toHaveTextContent("Authenticator App");
    fireEvent.click(within(modal()).getByRole("checkbox"));
    save();
    await waitFor(() =>
      expect(api.Set2FASetDefault).toHaveBeenCalledWith({
        tenantId: "tenant-1",
        Authenticator2FA: true,
        securityQuestion: false,
        setForAll: true,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Authenticator settings saved", "success");
    expect(badgedMethod()).toBe("Authenticator App");
  });

  it("leaves the badge where it was when the change is not for everyone", async () => {
    enabled();
    await ready();
    fireEvent.click(gear("Authenticator App"));
    save();
    await waitFor(() =>
      expect(api.Set2FASetDefault).toHaveBeenCalledWith(
        expect.objectContaining({ setForAll: false })
      )
    );
    expect(badgedMethod()).toBe("Security Question");
  });

  it("reports a refused authenticator change", async () => {
    api.Set2FASetDefault.mockRejectedValue(new Error("500"));
    enabled();
    await ready();
    fireEvent.click(gear("Authenticator App"));
    save();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to save authenticator settings",
        "error"
      )
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("makes the security question the default for everyone", async () => {
    enabled({ securityQuestion: false, Authenticator2FA: true });
    await ready();
    fireEvent.click(gear("Security Question"));
    expect(modal()).toHaveTextContent("Security Question Settings");
    // The stored method is not the default, so the box starts unticked.
    expect(within(modal()).getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(within(modal()).getByRole("checkbox"));
    save();
    await waitFor(() =>
      expect(api.Set2FASetDefault).toHaveBeenCalledWith(
        expect.objectContaining({ securityQuestion: true, Authenticator2FA: false, setForAll: true })
      )
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Security question settings saved",
      "success"
    );
    expect(badgedMethod()).toBe("Security Question");
  });

  it("leaves the badge alone when the security question change is not for everyone", async () => {
    enabled({ securityQuestion: false, Authenticator2FA: true });
    await ready();
    fireEvent.click(gear("Security Question"));
    save();
    await waitFor(() =>
      expect(api.Set2FASetDefault).toHaveBeenCalledWith(
        expect.objectContaining({ setForAll: false })
      )
    );
    expect(badgedMethod()).toBe("Authenticator App");
  });

  it("reports a refused security question change", async () => {
    api.Set2FASetDefault.mockRejectedValue(new Error("500"));
    enabled();
    await ready();
    fireEvent.click(gear("Security Question"));
    save();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to save settings", "error")
    );
  });

  it("closes a method's modal on cancel", async () => {
    enabled();
    await ready();
    fireEvent.click(gear("Security Question"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.Set2FASetDefault).not.toHaveBeenCalled();
  });
});
