import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * How the organisation admin's 2FA choice decides where staff can go from a
 * 2FA setup page: the admin back to their own settings, staff under a method
 * set for everyone nowhere (no choice to make), staff left to choose back to
 * their own choice page.
 */

const api = vi.hoisted(() => ({ GetSuperAdminChoices: vi.fn() }));
vi.mock("../api/authApis", () => ({ default: api }));
const auth = vi.hoisted(() => ({ value: {} }));
vi.mock("../hooks/useAuth", () => ({ default: () => auth.value }));

import useTwoFactorPolicy, { setupBackTarget } from "../hooks/useTwoFactorPolicy";

const choices = (over) => ({
  data: {
    data: { isEnabled: true, setForAll: false, Authenticator2FA: false, securityQuestion: false, ...over },
  },
});

const staff = { tenantId: "t1", user: { tenantId: "t1", role: { name: "Clinician" } } };

beforeEach(() => {
  vi.clearAllMocks();
  auth.value = staff;
});

describe("setupBackTarget", () => {
  it("returns the organisation admin to their 2FA settings", () => {
    expect(setupBackTarget({ isSuperAdmin: true, status: "loading" })).toBe("/auth/2fa-settings");
  });

  it("offers staff their own choice only when nothing is set for everyone", () => {
    expect(setupBackTarget({ isSuperAdmin: false, status: "ready", enforcedMethod: null })).toBe("/auth/2fa/choice");
    expect(setupBackTarget({ isSuperAdmin: false, status: "ready", enforcedMethod: "SECRETMESSAGE" })).toBeNull();
    expect(setupBackTarget({ isSuperAdmin: false, status: "failed" })).toBeNull();
  });
});

describe("useTwoFactorPolicy", () => {
  it("reads the organisation's policy and enforces its method", async () => {
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true, securityQuestion: true }));
    const { result } = renderHook(() => useTwoFactorPolicy());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(api.GetSuperAdminChoices).toHaveBeenCalledWith({ id: "t1" });
    expect(result.current.enforcedMethod).toBe("SECRETMESSAGE");
    expect(result.current.backTarget).toBeNull();
  });

  it("lets staff go back to choose when nothing is set for everyone", async () => {
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: false }));
    const { result } = renderHook(() => useTwoFactorPolicy());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.backTarget).toBe("/auth/2fa/choice");
  });

  it("treats a user whose role is Admin as the organisation admin, by object or by name", async () => {
    api.GetSuperAdminChoices.mockResolvedValue(choices({ setForAll: true, Authenticator2FA: true }));
    auth.value = { tenantId: "t1", user: { tenantId: "t1", role: { name: "Admin" } } };
    let { result } = renderHook(() => useTwoFactorPolicy());
    expect(result.current.backTarget).toBe("/auth/2fa-settings");
    auth.value = { tenantId: "t1", user: { tenantId: "t1", role: "Admin" } };
    ({ result } = renderHook(() => useTwoFactorPolicy()));
    expect(result.current.isSuperAdmin).toBe(true);
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("offers no way back when there is no organisation to read the policy from", async () => {
    auth.value = { user: null };
    const { result } = renderHook(() => useTwoFactorPolicy());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(api.GetSuperAdminChoices).not.toHaveBeenCalled();
    expect(result.current.backTarget).toBeNull();
  });
});
