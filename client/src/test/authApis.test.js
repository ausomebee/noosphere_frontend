import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios");
vi.mock("../Helper/fingerprint", () => ({
  getFingerprint: () => "test-fingerprint-123",
}));

import api, { refreshAccessToken } from "../api/authApis";

describe("authApis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ClientLogin", () => {
    it("posts to login endpoint with credentials", async () => {
      const mockResponse = { data: { data: { accessToken: "tok" } } };
      axios.post.mockResolvedValue(mockResponse);
      const result = await api.ClientLogin({ email: "user@test.com", password: "pass123" });
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/client/login"),
        { email: "user@test.com", password: "pass123" },
        { headers: { "x-fingerprint": "test-fingerprint-123" } },
      );
      expect(result).toEqual(mockResponse);
    });

    it("throws error with API message on failure", async () => {
      axios.post.mockRejectedValue({ response: { data: { message: "Invalid credentials" } } });
      await expect(api.ClientLogin({ email: "bad@test.com", password: "wrong" })).rejects.toThrow("Invalid credentials");
    });

    it("throws default error when no message", async () => {
      axios.post.mockRejectedValue({});
      await expect(api.ClientLogin({ email: "a", password: "b" })).rejects.toThrow("Login failed");
    });
  });

  describe("ClientForgetPassword", () => {
    it("patches with email in URL", async () => {
      axios.patch.mockResolvedValue({ data: { success: true } });
      await api.ClientForgetPassword({ email: "user@test.com" });
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining("/client/initiate/password-reset/user@test.com"),
        null,
        expect.any(Object),
      );
    });

    it("throws on failure", async () => {
      axios.patch.mockRejectedValue({ response: { data: { message: "User not found" } } });
      await expect(api.ClientForgetPassword({ email: "x@x.com" })).rejects.toThrow("User not found");
    });
  });

  describe("ClientSetPassword", () => {
    it("patches with clientTenantId and password", async () => {
      axios.patch.mockResolvedValue({ data: { success: true } });
      await api.ClientSetPassword({ clientTenantId: "ct1", password: "newPass123" });
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining("/client/password-reset"),
        { clientTenantId: "ct1", password: "newPass123" },
        expect.any(Object),
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("posts refresh token and dispatches new tokens", async () => {
      const dispatch = vi.fn();
      axios.post.mockResolvedValue({ data: { accessToken: "new-access-tok" } });
      const result = await refreshAccessToken("old-refresh", dispatch);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/refresh-token"),
        { creatorToken: "old-refresh" },
        expect.any(Object),
      );
      expect(dispatch).toHaveBeenCalled();
      expect(result).toBe("new-access-tok");
    });

    it("returns null on failure", async () => {
      axios.post.mockRejectedValue(new Error("Expired"));
      const result = await refreshAccessToken("bad-token", vi.fn());
      expect(result).toBeNull();
    });

    it("returns null when no accessToken in response", async () => {
      axios.post.mockResolvedValue({ data: {} });
      const result = await refreshAccessToken("tok", vi.fn());
      expect(result).toBeNull();
    });
  });
});
