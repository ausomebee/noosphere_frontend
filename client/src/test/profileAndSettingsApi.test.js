import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: mockPost, put: mockPut, patch: mockPatch }),
}));

import api from "../api/profileAndSettingsApi";

describe("profileAndSettingsApi", () => {
  beforeEach(() => vi.clearAllMocks());
  const auth = { accessToken: "tok", refreshToken: "ref" };

  describe("GetClientDetails", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: {} } });
      await api.GetClientDetails({ clientId: "c1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client/client/c1"));
    });

    it("throws on failure", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Not found" } } });
      await expect(api.GetClientDetails({ clientId: "c1", ...auth })).rejects.toThrow("Not found");
    });
  });

  describe("UpdateClientDetails", () => {
    it("puts client data", async () => {
      mockPut.mockResolvedValue({ data: {} });
      await api.UpdateClientDetails({
        clientId: "c1", firstName: "John", lastName: "Doe", email: "j@d.com",
        phoneNumber: "555", gender: "M", DOB: "1990-01-01", ...auth,
      });
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/client"),
        expect.objectContaining({ id: "c1", firstName: "John", lastName: "Doe" }),
      );
    });
  });

  describe("GetNotificationSettings", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: {} } });
      await api.GetNotificationSettings({ tenantClientId: "tc1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client/notification-settings/tc1"));
    });
  });

  describe("CreateNotificationSettings", () => {
    it("posts notification settings", async () => {
      mockPost.mockResolvedValue({ data: {} });
      await api.CreateNotificationSettings({
        tenantClientId: "tc1", appointmentScheduled: true, appointmentRescheduled: false,
        appointmentAboutToStart: true, appointmentStarted: false, appointmentCancelled: true,
        appointmentCompletedAwaitingFeedback: false, documentRequested: true, formShared: false,
        authorizationAboutToExpire: true, authorizationExpired: false,
        authorizationUnitsAlmostExhausted: true, authorizationUnitsExhausted: false,
        signatureRequested: true, ...auth,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/client/notification-settings"),
        expect.objectContaining({ tenantClientId: "tc1", appointmentScheduled: true }),
      );
    });
  });

  describe("UpdateNotificationSettings", () => {
    it("puts with id and fields", async () => {
      mockPut.mockResolvedValue({ data: {} });
      await api.UpdateNotificationSettings({ id: "ns1", appointmentScheduled: false, ...auth });
      expect(mockPut).toHaveBeenCalledWith(
        expect.stringContaining("/client/notification-settings/ns1"),
        expect.objectContaining({ id: "ns1", appointmentScheduled: false }),
      );
    });
  });

  describe("UploadProfileImage", () => {
    it("patches avatar URL", async () => {
      mockPatch.mockResolvedValue({ data: {} });
      await api.UploadProfileImage({ clientId: "c1", avatarUrl: "https://img.url", ...auth });
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/client/update-avatar"),
        { clientId: "c1", avatarUrl: "https://img.url" },
      );
    });
  });

  describe("UpdatePassword", () => {
    it("patches with password data", async () => {
      mockPatch.mockResolvedValue({ data: {} });
      await api.UpdatePassword({ clientTenantId: "ct1", currentPassword: "old", newPassword: "new", ...auth });
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/client/update-password"),
        { clientTenantId: "ct1", currentPassword: "old", newPassword: "new" },
      );
    });

    it("throws on failure", async () => {
      mockPatch.mockRejectedValue({ response: { data: { message: "Wrong password" } } });
      await expect(api.UpdatePassword({ clientTenantId: "ct1", currentPassword: "bad", newPassword: "new", ...auth })).rejects.toThrow("Wrong password");
    });
  });
});
