import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: mockPost }),
}));

import api from "../api/documentsAndFormsApis";

describe("documentsAndFormsApis", () => {
  beforeEach(() => vi.clearAllMocks());
  const auth = { accessToken: "tok", refreshToken: "ref" };

  describe("CreateNewFolder", () => {
    it("posts folder data", async () => {
      mockPost.mockResolvedValue({ data: { id: "f1" } });
      await api.CreateNewFolder({ clientTenantId: "ct1", folderName: "Reports", ...auth });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/client-folders"),
        { clientTenantId: "ct1", name: "Reports" },
      );
    });

    it("throws on failure", async () => {
      mockPost.mockRejectedValue({ response: { data: { message: "Duplicate" } } });
      await expect(api.CreateNewFolder({ clientTenantId: "ct1", folderName: "X", ...auth })).rejects.toThrow("Duplicate");
    });
  });

  describe("CreateNewFile", () => {
    it("posts file data with folder", async () => {
      mockPost.mockResolvedValue({ data: {} });
      await api.CreateNewFile({
        clientTenantId: "ct1", name: "doc.pdf", url: "/uploads/doc.pdf",
        size: "1MB", fileType: "pdf", folderId: "f1", ...auth,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/client-files"),
        expect.objectContaining({ name: "doc.pdf", folderId: "f1" }),
      );
    });
  });

  describe("GetAllFiles", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAllFiles({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-files/client/ct1"));
    });
  });

  describe("GetRecentFiles", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetRecentFiles({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-files/recent/ct1"));
    });
  });

  describe("GetAllFilesInFolder", () => {
    it("calls correct endpoint with folderId", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAllFilesInFolder({ folderId: "f1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-files/folder/f1"));
    });
  });

  describe("GetAllFolders", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAllFolders({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-folders/tenant/ct1"));
    });
  });

  describe("GetAllRequestDocuments", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAllRequestDocuments({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-requested-documents/client/ct1"));
    });
  });

  describe("GetCountsForDocumentRequests", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: {} } });
      await api.GetCountsForDocumentRequests({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-requested-documents/count/status/ct1"));
    });
  });

  describe("GetAllClientForms", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: [] } });
      await api.GetAllClientForms({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-forms/ct1"));
    });
  });

  describe("GetFormsCounts", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { data: {} } });
      await api.GetFormsCounts({ clientTenantId: "ct1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/client-forms/count/status/ct1"));
    });
  });

  describe("AttachDocumentsToRequest", () => {
    it("posts attachment data", async () => {
      mockPost.mockResolvedValue({ data: {} });
      const docs = [{ name: "doc.pdf", url: "/doc.pdf" }];
      await api.AttachDocumentsToRequest({
        clientTenantId: "ct1", name: "Request 1", documentDetails: docs, requestId: "r1", ...auth,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/client-documents"),
        expect.objectContaining({
          tenantClientId: "ct1",
          name: "Documents request Uploaded - Request 1",
          documentDetails: docs,
          requestId: "r1",
        }),
      );
    });
  });

  describe("GetFormWithItsFields", () => {
    it("calls correct endpoint", async () => {
      mockGet.mockResolvedValue({ data: { id: "form1", fields: [] } });
      const result = await api.GetFormWithItsFields({ formId: "form1", ...auth });
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/forms/form1"));
      expect(result).toEqual({ id: "form1", fields: [] });
    });
  });

  describe("CreateFormResponseField", () => {
    it("posts form response", async () => {
      mockPost.mockResolvedValue({ data: { id: "resp1" } });
      const fields = [{ formFieldId: "ff1", value: "answer" }];
      const result = await api.CreateFormResponseField({
        formId: "f1", tenantId: "t1", submittedBy: "u1", responseFields: fields, ...auth,
      });
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining("/form-responses"),
        expect.objectContaining({ formId: "f1", responseFields: fields }),
      );
      expect(result).toEqual({ id: "resp1" });
    });
  });
});
