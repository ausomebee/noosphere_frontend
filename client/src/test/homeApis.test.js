import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AxiosInterceptor to return a fake axios instance
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: mockPost, patch: mockPatch }),
}));

import api from "../api/homeApis";

describe("homeApis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const authParams = { accessToken: "tok", refreshToken: "ref" };

  describe("GetClientSessionOverview", () => {
    it("calls correct endpoint with clientId", async () => {
      mockGet.mockResolvedValue({ data: { data: {} } });
      await api.GetClientSessionOverview({ clientId: "c1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sessions/client/overview/client/c1"));
    });

    it("returns response on success", async () => {
      const mockResponse = { data: { data: { completedSession: 5 } } };
      mockGet.mockResolvedValue(mockResponse);
      const result = await api.GetClientSessionOverview({ clientId: "c1", ...authParams });
      expect(result).toEqual(mockResponse);
    });

    it("throws error on failure", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Not found" } } });
      await expect(api.GetClientSessionOverview({ clientId: "c1", ...authParams })).rejects.toThrow("Not found");
    });

    it("throws default error when no message", async () => {
      mockGet.mockRejectedValue({});
      await expect(api.GetClientSessionOverview({ clientId: "c1", ...authParams })).rejects.toThrow("Get client overview by client id failed");
    });
  });

  describe("GetClientSessionChart", () => {
    it("calls correct endpoint with clientId and groupBy", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientSessionChart({ clientId: "c1", groupBy: "month", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sessions/client/overview-chart/client/c1/month"));
    });

    it("throws on failure", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Chart error" } } });
      await expect(api.GetClientSessionChart({ clientId: "c1", groupBy: "week", ...authParams })).rejects.toThrow("Chart error");
    });
  });

  describe("GetAllAuthorizationServiceCodes", () => {
    it("calls correct endpoint with tenantClientId", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAllAuthorizationServiceCodes({ tenantClientId: "tc1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-authorization/chart/tc1"));
    });
  });

  describe("GetClientUpcomingAppointments", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientUpcomingAppointments({ clientId: "c1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/appointments/client/upcoming/client/c1"));
    });
  });

  describe("GetClientCompletedAppointments", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientCompletedAppointments({ clientId: "c1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sessions/client/client/c1"));
    });
  });

  describe("GetClientCancelAppointments", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientCancelAppointments({ clientId: "c1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/appointments/client/canceled/client/c1"));
    });
  });

  describe("GetClientAwaitingApprovals", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientAwaitingApprovals({ clientId: "c1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sessions/client/awaiting-feedback/client/c1"));
    });
  });

  describe("GetClientRescheduledAppointments", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientRescheduledAppointments({ clientId: "c1", ...authParams });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/appointments/client/rescheduled/client/c1"));
    });
  });

  describe("ApproveSession", () => {
    it("posts approval data", async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await api.ApproveSession({
        sessionId: "s1", confirmDelivery: true, rateService: 5,
        rateTherapist: 4, feedback: "Great", signature: "sig", ...authParams,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/sessions-approval"),
        expect.objectContaining({ sessionId: "s1", confirmDelivery: true }),
      );
    });

    it("throws on failure", async () => {
      mockPost.mockRejectedValue({ response: { data: { message: "Approval failed" } } });
      await expect(api.ApproveSession({ sessionId: "s1", ...authParams })).rejects.toThrow("Approval failed");
    });
  });

  describe("RescheduleAppointments", () => {
    it("patches with formatted date", async () => {
      mockPatch.mockResolvedValue({ data: { success: true } });
      const date = new Date(2025, 5, 15); // June 15, 2025
      await api.RescheduleAppointments({
        tenantId: "t1", id: "a1", date, startTime: "10:00", endTime: "11:00",
        forAll: false, reasonForReschedule: "Conflict", rescheduled: true, ...authParams,
      });
      expect(mockPatch).toHaveBeenCalledWith(
        expect.stringContaining("/appointments/reschedule"),
        expect.objectContaining({ date: "2025-06-15", startTime: "10:00" }),
      );
    });

    it("throws on failure", async () => {
      mockPatch.mockRejectedValue({ response: { data: { message: "Conflict" } } });
      await expect(api.RescheduleAppointments({ tenantId: "t1", id: "a1", date: new Date(), ...authParams })).rejects.toThrow();
    });
  });

  describe("error paths - default messages", () => {
    it("GetAllAuthorizationServiceCodes throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Auth fail" } } });
      await expect(api.GetAllAuthorizationServiceCodes({ tenantClientId: "tc1", ...authParams })).rejects.toThrow("Auth fail");
    });
    it("GetClientUpcomingAppointments throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetClientUpcomingAppointments({ clientId: "c1", ...authParams })).rejects.toThrow("Fail");
    });
    it("GetClientCompletedAppointments throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetClientCompletedAppointments({ clientId: "c1", ...authParams })).rejects.toThrow("Fail");
    });
    it("GetClientCancelAppointments throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetClientCancelAppointments({ clientId: "c1", ...authParams })).rejects.toThrow("Fail");
    });
    it("GetClientAwaitingApprovals throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetClientAwaitingApprovals({ clientId: "c1", ...authParams })).rejects.toThrow("Fail");
    });
    it("GetClientRescheduledAppointments throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetClientRescheduledAppointments({ clientId: "c1", ...authParams })).rejects.toThrow("Fail");
    });
    it("GetClientSessionChart throws default message", async () => {
      mockGet.mockRejectedValue(new Error("Network"));
      await expect(api.GetClientSessionChart({ clientId: "c1", groupBy: "week", ...authParams })).rejects.toThrow();
    });
  });
});
