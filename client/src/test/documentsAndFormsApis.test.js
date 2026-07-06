import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ get: mockGet, post: mockPost }),
}));

import api from "../api/documentsAndFormsApis";
import { fileToBase64 } from "../api/documentsAndFormsApis";

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
      expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/forms/client/form1"));
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

    it("throws on failure", async () => {
      mockPost.mockRejectedValue({ response: { data: { message: "Submit failed" } } });
      await expect(api.CreateFormResponseField({ formId: "f1", tenantId: "t1", submittedBy: "u1", responseFields: [], ...auth })).rejects.toThrow("Submit failed");
    });
  });

  describe("error paths", () => {
    it("CreateNewFile throws default message", async () => {
      mockPost.mockRejectedValue({});
      await expect(api.CreateNewFile({ clientTenantId: "ct1", name: "x", url: "u", size: "1", fileType: "pdf", ...auth })).rejects.toThrow();
    });

    it("GetAllFiles throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetAllFiles({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetRecentFiles throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetRecentFiles({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetAllFilesInFolder throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetAllFilesInFolder({ folderId: "f1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetAllFolders throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetAllFolders({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetAllRequestDocuments throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetAllRequestDocuments({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetCountsForDocumentRequests throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetCountsForDocumentRequests({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetAllClientForms throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetAllClientForms({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetFormsCounts throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.GetFormsCounts({ clientTenantId: "ct1", ...auth })).rejects.toThrow("Fail");
    });

    it("AttachDocumentsToRequest throws on error", async () => {
      mockPost.mockRejectedValue({ response: { data: { message: "Fail" } } });
      await expect(api.AttachDocumentsToRequest({ clientTenantId: "ct1", name: "X", documentDetails: [], requestId: "r1", ...auth })).rejects.toThrow("Fail");
    });

    it("GetFormWithItsFields throws on error", async () => {
      mockGet.mockRejectedValue({ response: { data: { message: "Not found" } } });
      await expect(api.GetFormWithItsFields({ formId: "f1", ...auth })).rejects.toThrow("Not found");
    });

  });

  describe("fileToBase64", () => {
    it("converts file to base64 string", async () => {
      const file = new File(["hello world"], "test.txt", { type: "text/plain" });
      const result = await fileToBase64(file);
      expect(result).toContain("data:");
      expect(typeof result).toBe("string");
    });

    it("rejects on reader error", async () => {
      const badFile = { name: "bad" };
      // FileReader will fail on non-Blob input
      await expect(fileToBase64(badFile)).rejects.toBeDefined();
    });
  });
});
