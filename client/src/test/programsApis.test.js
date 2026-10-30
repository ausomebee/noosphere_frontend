import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet }),
}));

import api from "../api/programsApis";

describe("programsApis", () => {
  beforeEach(() => vi.clearAllMocks());
  const auth = { accessToken: "tok", refreshToken: "ref" };

  describe("GetClientProgramsAndTargets", () => {
    it("calls correct endpoint with clientId", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientProgramsAndTargets({ clientId: "c1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-programs/target/c1"));
    });

    it("returns response on success", async () => {
      const mockResponse = { data: { data: [{ program: { name: "ABA" } }] } };
      mockGet.mockResolvedValue(mockResponse);
      const result = await api.GetClientProgramsAndTargets({ clientId: "c1", ...auth });
      expect(result).toEqual(mockResponse);
    });

    it("throws on failure", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Server error" } } });
      await expect(api.GetClientProgramsAndTargets({ clientId: "c1", ...auth })).rejects.toThrow("Server error");
    });

    it("throws default error when no message", async () => {
      mockGet.mockRejectedValue({});
      await expect(api.GetClientProgramsAndTargets({ clientId: "c1", ...auth })).rejects.toThrow("Get client programs and targets failed");
    });
  });

  describe("GetClientTargetPerformance", () => {
    it("calls correct endpoint with targetId and clientId", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetClientTargetPerformance({ clientId: "c1", targetId: "t1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/sessions/performance/client/t1/c1"));
    });

    it("throws on failure", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Not found" } } });
      await expect(api.GetClientTargetPerformance({ clientId: "c1", targetId: "t1", ...auth })).rejects.toThrow("Not found");
    });
  });
});
