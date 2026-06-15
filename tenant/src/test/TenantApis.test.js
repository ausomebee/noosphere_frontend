import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../Helper/AxiosInterceptor", () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  })),
}));

import AxiosInterceptor from "../Helper/AxiosInterceptor";

// We need to import after mocking
let api;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("../api/TenantApis");
  api = mod.default || mod;
});

describe("TenantApis", () => {
  const tokens = { accessToken: "access", refreshToken: "refresh" };

  describe("GetPipelineByTenantId", () => {
    it("calls GET with correct URL", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { id: 1 } });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });

      const result = await api.GetPipelineByTenantId({ tenantId: "t1", ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/pipeline/tenant/tenant/t1"));
    });

    it("throws on error", async () => {
      const mockGet = vi.fn().mockRejectedValue({ response: { data: { message: "Not found" } } });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });

      await expect(api.GetPipelineByTenantId({ tenantId: "t1", ...tokens })).rejects.toThrow("Not found");
    });
  });

  describe("CreatePipelineStage", () => {
    it("calls POST with correct payload", async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: "s1" } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: mockPost, put: vi.fn(), patch: vi.fn(), delete: vi.fn() });

      await api.CreatePipelineStage({
        pipelineId: "p1",
        name: "Stage 1",
        description: "desc",
        colourCode: "#fff",
        ...tokens,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/pipeline/stage"),
        expect.objectContaining({ pipelineId: "p1", name: "Stage 1" })
      );
    });
  });

  describe("UpdatePipelineStage", () => {
    it("calls PATCH with correct payload", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });

      await api.UpdatePipelineStage({
        id: "s1",
        name: "Updated",
        description: "new desc",
        colourCode: "#000",
        ...tokens,
      });
      expect(mockPatch).toHaveBeenCalled();
    });

    it("throws on error", async () => {
      const mockPatch = vi.fn().mockRejectedValue({ response: { data: { message: "Fail" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await expect(api.UpdatePipelineStage({ id: "s1", name: "X", description: "", colourCode: "", ...tokens })).rejects.toThrow("Fail");
    });
  });

  describe("DeletePipelineStage", () => {
    it("calls DELETE with correct URL", async () => {
      const mockDel = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: mockDel });
      await api.DeletePipelineStage({ id: "s1", ...tokens });
      expect(mockDel).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/s1"));
    });
    it("throws on error", async () => {
      const mockDel = vi.fn().mockRejectedValue({ response: { data: { message: "Delete failed" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: mockDel });
      await expect(api.DeletePipelineStage({ id: "s1", ...tokens })).rejects.toThrow("Delete failed");
    });
  });

  describe("DeletePipelineItem", () => {
    it("calls DELETE with ids payload", async () => {
      const mockDel = vi.fn().mockResolvedValue({ data: { success: true } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: mockDel });
      const result = await api.DeletePipelineItem({ ids: ["i1", "i2"], ...tokens });
      expect(mockDel).toHaveBeenCalledWith(expect.stringContaining("/pipeline/multi/tenant/item"), { data: { ids: ["i1", "i2"] } });
    });
    it("throws on error", async () => {
      const mockDel = vi.fn().mockRejectedValue({ response: { data: { message: "Error" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: mockDel });
      await expect(api.DeletePipelineItem({ ids: ["i1"], ...tokens })).rejects.toThrow("Error");
    });
  });

  describe("GetPipelineStage", () => {
    it("calls GET with pipelineId", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: [] });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await api.GetPipelineStage({ pipelineId: "p1", ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/pipeline/tenant/stage/pipeline/p1"));
    });
    it("throws on error", async () => {
      const mockGet = vi.fn().mockRejectedValue({ response: { data: { message: "Fail" } } });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await expect(api.GetPipelineStage({ pipelineId: "p1", ...tokens })).rejects.toThrow("Fail");
    });
  });

  describe("ReorderPipelineStage", () => {
    it("calls PATCH with id and order", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.ReorderPipelineStage({ id: "s1", order: 2, ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/order"), { id: "s1", order: 2 });
    });
    it("throws on error", async () => {
      const mockPatch = vi.fn().mockRejectedValue({ response: { data: { message: "Fail" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await expect(api.ReorderPipelineStage({ id: "s1", order: 2, ...tokens })).rejects.toThrow("Fail");
    });
  });

  describe("GetSinglePipelineStage", () => {
    it("calls GET with stageId", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { id: "s1" } });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await api.GetSinglePipelineStage({ pipelineStageId: "s1", ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/s1"));
    });
  });

  describe("GetPipelineItem", () => {
    it("calls GET with stageId", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: [] });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await api.GetPipelineItem({ stageId: "s1", ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/stage/client/s1"));
    });
  });

  describe("GetSinglePipelineItem", () => {
    it("calls GET with itemId", async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { id: "i1" } });
      AxiosInterceptor.mockReturnValue({ get: mockGet, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await api.GetSinglePipelineItem({ itemId: "i1", ...tokens });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/client/i1"));
    });
  });

  describe("UpdatePipelineItemActivity", () => {
    it("calls PATCH with ids and stageId", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdatePipelineItemActivity({ ids: ["i1"], pipelineStageId: "s2", ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/multi/move/tenant/item"), { ids: ["i1"], pipelineStageId: "s2" });
    });
    it("throws on error", async () => {
      const mockPatch = vi.fn().mockRejectedValue({ response: { data: { message: "Fail" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await expect(api.UpdatePipelineItemActivity({ ids: ["i1"], pipelineStageId: "s2", ...tokens })).rejects.toThrow("Fail");
    });
  });

  describe("CreateCandidate", () => {
    it("calls POST with candidate data", async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: "c1" } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: mockPost, put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await api.CreateCandidate({ firstName: "John", lastName: "Doe", email: "j@d.com", phoneNumber: "555", gender: "M", DOB: "1990-01-01", tenantId: "t1", pipelineStageId: "s1", ...tokens });
      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/client"), expect.objectContaining({ firstName: "John" }));
    });
    it("throws on error", async () => {
      const mockPost = vi.fn().mockRejectedValue({ response: { data: { message: "Create failed" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: mockPost, put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await expect(api.CreateCandidate({ firstName: "John", lastName: "Doe", email: "j@d.com", ...tokens })).rejects.toThrow("Create failed");
    });
  });

  describe("UpdateCandidate", () => {
    it("calls PUT with candidate data", async () => {
      const mockPut = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: mockPut, patch: vi.fn(), delete: vi.fn() });
      await api.UpdateCandidate({ id: "c1", firstName: "Jane", lastName: "Doe", email: "j@d.com", ...tokens });
      expect(mockPut).toHaveBeenCalledWith(expect.stringContaining("/client"), expect.objectContaining({ id: "c1", firstName: "Jane" }));
    });
    it("throws on error", async () => {
      const mockPut = vi.fn().mockRejectedValue({ response: { data: { message: "Update failed" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: mockPut, patch: vi.fn(), delete: vi.fn() });
      await expect(api.UpdateCandidate({ id: "c1", ...tokens })).rejects.toThrow("Update failed");
    });
  });

  describe("UpdateStageTasks", () => {
    it("calls PATCH with tasks array", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdateStageTasks({ pipelineStageId: "s1", tasks: ["task1"], ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/task"), { id: "s1", tasks: ["task1"] });
    });
    it("defaults to empty array for non-array tasks", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdateStageTasks({ pipelineStageId: "s1", tasks: null, ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.anything(), { id: "s1", tasks: [] });
    });
  });

  describe("UpdateStageDocuments", () => {
    it("calls PATCH with documents array", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdateStageDocuments({ pipelineStageId: "s1", documents: ["doc1"], ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/stage/document"), { id: "s1", documents: ["doc1"] });
    });
    it("defaults to empty array for non-array documents", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdateStageDocuments({ pipelineStageId: "s1", documents: "invalid", ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.anything(), { id: "s1", documents: [] });
    });
  });

  describe("UpdateStageDocumentsToDone", () => {
    it("calls PATCH with sent documents", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdateStageDocumentsToDone({ pipelineItemId: "i1", documents: ["d1"], ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/document"), { id: "i1", sentDocuments: ["d1"] });
    });
  });

  describe("UpdateStageTasksToDone", () => {
    it("calls PATCH with done tasks", async () => {
      const mockPatch = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: mockPatch, delete: vi.fn() });
      await api.UpdateStageTasksToDone({ pipelineItemId: "i1", doneTasks: ["t1"], ...tokens });
      expect(mockPatch).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/task"), { id: "i1", doneTasks: ["t1"] });
    });
  });

  describe("UploadDocumentForPipelineItem", () => {
    it("calls POST with FormData", async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: mockPost, put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      const mockFile = new File(["content"], "test.pdf", { type: "application/pdf" });
      await api.UploadDocumentForPipelineItem({ pipelineItemId: "i1", docName: "doc", files: [mockFile], ...tokens });
      expect(mockPost).toHaveBeenCalledWith(expect.stringContaining("/pipeline/item/document/i1"), expect.any(FormData), expect.objectContaining({ headers: { "Content-Type": "multipart/form-data" } }));
    });
    it("throws on error", async () => {
      const mockPost = vi.fn().mockRejectedValue({ response: { data: { message: "Upload failed" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: mockPost, put: vi.fn(), patch: vi.fn(), delete: vi.fn() });
      await expect(api.UploadDocumentForPipelineItem({ pipelineItemId: "i1", docName: "doc", files: [], ...tokens })).rejects.toThrow("Upload failed");
    });
  });

  describe("MoveCandidateToClient", () => {
    it("calls DELETE with pipelineItemId", async () => {
      const mockDel = vi.fn().mockResolvedValue({ data: {} });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: mockDel });
      await api.MoveCandidateToClient({ pipelineItemId: "i1", ...tokens });
      expect(mockDel).toHaveBeenCalledWith(expect.stringContaining("/pipeline/client/item/i1"));
    });
    it("throws on error", async () => {
      const mockDel = vi.fn().mockRejectedValue({ response: { data: { message: "Move failed" } } });
      AxiosInterceptor.mockReturnValue({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: mockDel });
      await expect(api.MoveCandidateToClient({ pipelineItemId: "i1", ...tokens })).rejects.toThrow("Move failed");
    });
  });
});
