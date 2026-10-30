import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: mockPost, patch: mockPatch }),
}));

import api from "../api/messageApi";

describe("messageApi", () => {
  beforeEach(() => vi.clearAllMocks());
  const auth = { accessToken: "tok", refreshToken: "ref" };

  describe("GetAssignedClinicians", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAssignedClinicians({ clientId: "c1", tenantId: "t1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/appointments/client/clinician/c1/t1"));
    });

    it("throws on failure", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Forbidden" } } });
      await expect(api.GetAssignedClinicians({ clientId: "c1", tenantId: "t1", ...auth })).rejects.toThrow("Forbidden");
    });
  });

  describe("SendMessage", () => {
    it("posts message data", async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await api.SendMessage({ clientId: "c1", clinicianId: "cl1", subject: "Hi", message: "Hello", ...auth });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/messages"),
        expect.objectContaining({ clientId: "c1", clinicianId: "cl1", subject: "Hi", message: "Hello" }),
      );
    });
  });

  describe("GetUserMessages", () => {
    it("calls with userId and userType", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetUserMessages({ userId: "u1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/messages/user/client/u1/CLIENT"));
    });

    it("uses custom userType", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetUserMessages({ userId: "u1", userType: "STAFF", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/messages/user/client/u1/STAFF"));
    });
  });

  describe("MarkMessageAsRead", () => {
    it("patches correct endpoint", async () => {
      mockPatch.mockResolvedValue({ data: {} });
      await api.MarkMessageAsRead({ messageId: "m1", ...auth });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/messages/read/client/m1"));
    });

    it("throws on failure", async () => {
      mockPatch.mockRejectedValue({ response: { data: { message: "Not found" } } });
      await expect(api.MarkMessageAsRead({ messageId: "m1", ...auth })).rejects.toThrow("Not found");
    });
  });

  describe("GetNotifications", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetNotifications({ userId: "u1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/notifications/user/client/u1/CLIENT"));
    });
  });

  describe("MarkNotificationRead", () => {
    it("patches the correct endpoint", async () => {
      mockPatch.mockResolvedValue({ data: {} });
      await api.MarkNotificationRead({ id: "n1", ...auth });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/notifications/read/client/n1"));
    });
    it("throws on failure", async () => {
      mockPatch.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.MarkNotificationRead({ id: "n1", ...auth })).rejects.toThrow("Fail");
    });
  });

  describe("error paths", () => {
    it("GetAssignedClinicians throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetAssignedClinicians({ clientId: "c1", tenantId: "t1", ...auth })).rejects.toThrow("Fail");
    });
    it("GetUserMessages throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetUserMessages({ userId: "u1", ...auth })).rejects.toThrow("Fail");
    });
    it("GetNotifications throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetNotifications({ userId: "u1", ...auth })).rejects.toThrow("Fail");
    });
    it("SendMessage throws on error", async () => {
      mockPost.mockRejectedValue({ response: { data: { message: "Send fail" } } });
      await expect(api.SendMessage({ senderId: "u1", receiverId: "u2", content: "hi", ...auth })).rejects.toThrow("Send fail");
    });
  });
});
