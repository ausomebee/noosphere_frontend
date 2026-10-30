import { describe, it, expect, vi, beforeEach } from "vitest";

let requestCallback, requestErrorCallback, responseCallback, responseErrorCallback;
const mockAuthFetch = vi.fn();

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => {
      const instance = Object.assign(mockAuthFetch, {
        interceptors: {
          request: {
            use: vi.fn((success, error) => {
              requestCallback = success;
              requestErrorCallback = error;
            }),
          },
          response: {
            use: vi.fn((success, error) => {
              responseCallback = success;
              responseErrorCallback = error;
            }),
          },
        },
      });
      return instance;
    }),
  },
}));

vi.mock("../Helper/ShowToast", () => ({ showToast: vi.fn() }));
vi.mock("../api/authApis", () => ({
  default: { refreshAccessToken: vi.fn() },
}));

const mockStore = vi.hoisted(() => ({
  getState: vi.fn(() => ({ authentication: { refreshToken: "stored-refresh" } })),
  dispatch: vi.fn(),
}));

const mockPersistor = vi.hoisted(() => ({ purge: vi.fn() }));

vi.mock("../Helper/storeRef", () => ({
  getStore: vi.fn(() => mockStore),
  getPersistor: vi.fn(() => mockPersistor),
}));

vi.mock("../ReduxStore/features/authentication", () => ({
  logout: vi.fn(() => ({ type: "auth/logout" })),
  setTokens: vi.fn((tokens) => ({ type: "auth/setTokens", payload: tokens })),
}));

import AxiosInterceptor from "../Helper/AxiosInterceptor";
import api from "../api/authApis";
import { showToast } from "../Helper/ShowToast";

describe("AxiosInterceptor interceptor callbacks", () => {
  const mockDispatch = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    AxiosInterceptor("test-token", "refresh-token", mockDispatch, mockNavigate);
  });

  describe("request interceptor", () => {
    it("adds Authorization header when token exists", () => {
      const config = { headers: {} };
      const result = requestCallback(config);
      expect(result.headers["Authorization"]).toBe("Bearer test-token");
    });

    it("returns config without auth header when no token", () => {
      // Re-init without token
      AxiosInterceptor(null, "refresh-token", mockDispatch, mockNavigate);
      const config = { headers: {} };
      const result = requestCallback(config);
      expect(result.headers["Authorization"]).toBeUndefined();
    });

    it("rejects request errors", async () => {
      const error = new Error("Request failed");
      await expect(requestErrorCallback(error)).rejects.toThrow("Request failed");
    });
  });

  describe("response interceptor", () => {
    it("passes through successful responses", () => {
      const response = { data: { ok: true } };
      expect(responseCallback(response)).toEqual(response);
    });

    it("rejects non-401 errors", async () => {
      const error = { response: { status: 500 }, config: {} };
      await expect(responseErrorCallback(error)).rejects.toEqual(error);
    });

    it("attempts token refresh on 401", async () => {
      api.refreshAccessToken.mockResolvedValue("new-token");
      mockAuthFetch.mockResolvedValue({ data: "ok" });

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await responseErrorCallback(error);
      expect(api.refreshAccessToken).toHaveBeenCalledWith("stored-refresh", expect.any(Function));
    });

    it("dispatches logout and rejects when refresh returns no token", async () => {
      api.refreshAccessToken.mockResolvedValue(null);
      const { logout } = await import("../ReduxStore/features/authentication");

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorCallback(error)).rejects.toEqual(error);
      expect(showToast).toHaveBeenCalledWith("Session expired. Please log in again.", "error");
      expect(mockStore.dispatch).toHaveBeenCalledWith(logout());
      // Drafts carry client data — they must not outlive the session.
      expect(mockPersistor.purge).toHaveBeenCalled();
    });

    it("keeps the session when the refresh call fails without a response", async () => {
      api.refreshAccessToken.mockRejectedValue(new Error("Network Error"));
      const { logout } = await import("../ReduxStore/features/authentication");

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorCallback(error)).rejects.toEqual(error);
      // An API restarting mid-deploy must not sign everyone out.
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(logout());
      expect(mockPersistor.purge).not.toHaveBeenCalled();
    });

    it("keeps the session when the refresh call returns a 502", async () => {
      api.refreshAccessToken.mockRejectedValue({ response: { status: 502 } });
      const { logout } = await import("../ReduxStore/features/authentication");

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorCallback(error)).rejects.toEqual(error);
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(logout());
    });

    it("ends the session when the refresh token itself is rejected", async () => {
      api.refreshAccessToken.mockRejectedValue({ response: { status: 403 } });
      const { logout } = await import("../ReduxStore/features/authentication");

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorCallback(error)).rejects.toEqual(error);
      expect(mockStore.dispatch).toHaveBeenCalledWith(logout());
      expect(mockPersistor.purge).toHaveBeenCalled();
    });

    it("handles refresh error gracefully", async () => {
      api.refreshAccessToken.mockRejectedValue(new Error("refresh failed"));

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: false },
      };

      await expect(responseErrorCallback(error)).rejects.toEqual(error);
    });
  });
});
