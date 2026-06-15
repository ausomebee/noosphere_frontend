import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthFetch = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../Helper/AxiosInterceptor", () => ({
  default: vi.fn(() => mockAuthFetch),
}));

describe("TenantApis comprehensive", () => {
  const tokens = { accessToken: "access", refreshToken: "refresh" };
  let api;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthFetch.get.mockResolvedValue({ data: {} });
    mockAuthFetch.post.mockResolvedValue({ data: {} });
    mockAuthFetch.patch.mockResolvedValue({ data: {} });
    mockAuthFetch.delete.mockResolvedValue({ data: {} });
    const mod = await import("../api/TenantApis");
    api = mod.default || mod;
  });

  // Pipeline APIs
  describe("Pipeline APIs", () => {
    it("GetPipelineByTenantId", async () => {
      await api.GetPipelineByTenantId({ tenantId: "t1", ...tokens });
      expect(mockAuthFetch.get).toHaveBeenCalledWith(expect.stringContaining("/pipeline/tenant/tenant/t1"));
    });

    it("CreatePipelineStage", async () => {
      await api.CreatePipelineStage({ pipelineId: "p1", name: "S1", description: "d", colourCode: "#fff", ...tokens });
      expect(mockAuthFetch.post).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage"), expect.any(Object));
    });

    it("UpdatePipelineStage", async () => {
      await api.UpdatePipelineStage({ id: "s1", name: "Up", description: "d", colourCode: "#000", ...tokens });
      expect(mockAuthFetch.patch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage"), expect.any(Object));
    });

    it("DeletePipelineStage", async () => {
      await api.DeletePipelineStage({ id: "s1", ...tokens });
      expect(mockAuthFetch.delete).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/s1"));
    });

    it("DeletePipelineItem", async () => {
      await api.DeletePipelineItem({ ids: ["i1", "i2"], ...tokens });
      expect(mockAuthFetch.delete).toHaveBeenCalledWith(
        expect.stringContaining("/pipeline/multi/tenant/item"),
        expect.objectContaining({ data: { ids: ["i1", "i2"] } })
      );
    });

    it("GetPipelineStage", async () => {
      await api.GetPipelineStage({ pipelineId: "p1", ...tokens });
      expect(mockAuthFetch.get).toHaveBeenCalledWith(expect.stringContaining("/pipeline/tenant/stage/pipeline/p1"));
    });

    it("ReorderPipelineStage", async () => {
      await api.ReorderPipelineStage({ id: "s1", order: 2, ...tokens });
      expect(mockAuthFetch.patch).toHaveBeenCalledWith(
        expect.stringContaining("/pipeline/stage/order"),
        expect.objectContaining({ id: "s1", order: 2 })
      );
    });

    it("GetSinglePipelineStage", async () => {
      await api.GetSinglePipelineStage({ pipelineStageId: "ps1", ...tokens });
      expect(mockAuthFetch.get).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/ps1"));
    });

    it("GetPipelineItem", async () => {
      await api.GetPipelineItem({ stageId: "s1", ...tokens });
      expect(mockAuthFetch.get).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/stage/client/s1"));
    });

    it("GetSinglePipelineItem", async () => {
      await api.GetSinglePipelineItem({ itemId: "i1", ...tokens });
      expect(mockAuthFetch.get).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/client/i1"));
    });

    it("UpdatePipelineItemActivity", async () => {
      await api.UpdatePipelineItemActivity({ ids: ["i1"], pipelineStageId: "s2", ...tokens });
      expect(mockAuthFetch.patch).toHaveBeenCalledWith(
        expect.stringContaining("/pipeline/multi/move/tenant/item"),
        expect.any(Object)
      );
    });
  });

  // Error handling
  describe("error handling", () => {
    it("GetPipelineByTenantId throws on error", async () => {
      mockAuthFetch.get.mockRejectedValueOnce({ response: { data: { message: "Not found" } } });
      await expect(api.GetPipelineByTenantId({ tenantId: "t1", ...tokens })).rejects.toThrow("Not found");
    });

    it("CreatePipelineStage throws on error", async () => {
      mockAuthFetch.post.mockRejectedValueOnce({ response: { data: { message: "Bad request" } } });
      await expect(api.CreatePipelineStage({ pipelineId: "p1", name: "S", description: "d", colourCode: "#f", ...tokens })).rejects.toThrow("Bad request");
    });

    it("DeletePipelineStage throws default message on unknown error", async () => {
      mockAuthFetch.delete.mockRejectedValueOnce({});
      await expect(api.DeletePipelineStage({ id: "s1", ...tokens })).rejects.toThrow("Delete Pipeline Stage failed");
    });
  });

  // Candidate APIs
  describe("Candidate APIs", () => {
    it("CreateCandidate calls post", async () => {
      await api.CreateCandidate({
        firstName: "John",
        lastName: "Doe",
        preferredName: "JD",
        email: "j@d.com",
        phoneNumber: "123",
        gender: "male",
        DOB: "2000-01-01",
        streetAddress: "123 St",
        city: "NY",
        state: "NY",
        zip: "10001",
        country: "US",
        tenantId: "t1",
        pipelineStageId: "ps1",
        ...tokens,
      });
      expect(mockAuthFetch.post).toHaveBeenCalled();
    });
  });
});
