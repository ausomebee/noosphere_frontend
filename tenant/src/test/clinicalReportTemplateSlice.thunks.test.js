import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import reducer, {
  saveTemplate,
  loadTemplate,
} from "../ReduxStore/features/clinicalReportTemplateSlice";

const makeStore = () =>
  configureStore({ reducer: { clinicalReportTemplate: reducer } });

const tokens = { accessToken: "at", refreshToken: "rt" };

describe("clinicalReportTemplateSlice thunks", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("loadTemplate", () => {
    it("fulfilled loads template with sections", async () => {
      const mockApi = {
        GetSingleClinicalReportTemplateById: vi.fn().mockResolvedValue({
          data: {
            id: "t1",
            title: "My Template",
            sections: [
              {
                id: "sec1",
                section: "Subjective",
                content: { value: "Patient reports pain" },
                order: 0,
              },
              {
                id: "sec2",
                section: "Objective",
                content: { items: [{ text: "BP 120/80" }] },
                order: 1,
              },
            ],
          },
        }),
      };

      const store = makeStore();
      const result = await store.dispatch(
        loadTemplate({ templateId: "t1", api: mockApi, tokens })
      );

      expect(result.type).toBe("clinicalReportTemplate/loadTemplate/fulfilled");
      expect(mockApi.GetSingleClinicalReportTemplateById).toHaveBeenCalledWith({
        Id: "t1",
        accessToken: "at",
        refreshToken: "rt",
      });
    });

    it("rejected when API fails", async () => {
      const mockApi = {
        GetSingleClinicalReportTemplateById: vi.fn().mockRejectedValue(
          new Error("Not found")
        ),
      };

      const store = makeStore();
      const result = await store.dispatch(
        loadTemplate({ templateId: "bad", api: mockApi, tokens })
      );

      expect(result.type).toBe("clinicalReportTemplate/loadTemplate/rejected");
    });

    it("handles empty sections array", async () => {
      const mockApi = {
        GetSingleClinicalReportTemplateById: vi.fn().mockResolvedValue({
          data: { id: "t2", title: "Empty", sections: [] },
        }),
      };

      const store = makeStore();
      const result = await store.dispatch(
        loadTemplate({ templateId: "t2", api: mockApi, tokens })
      );

      expect(result.type).toBe("clinicalReportTemplate/loadTemplate/fulfilled");
    });

    it("handles sections with content.items array", async () => {
      const mockApi = {
        GetSingleClinicalReportTemplateById: vi.fn().mockResolvedValue({
          data: {
            id: "t3",
            sections: [
              {
                id: "s1",
                section: "Goals",
                content: { items: ["Goal 1", "Goal 2"] },
                order: 0,
              },
            ],
          },
        }),
      };

      const store = makeStore();
      const result = await store.dispatch(
        loadTemplate({ templateId: "t3", api: mockApi, tokens })
      );

      expect(result.type).toBe("clinicalReportTemplate/loadTemplate/fulfilled");
    });

    it("handles sections with plain content value", async () => {
      const mockApi = {
        GetSingleClinicalReportTemplateById: vi.fn().mockResolvedValue({
          data: {
            id: "t4",
            sections: [
              {
                id: "s1",
                section: "Summary",
                content: { value: "All good" },
                order: 0,
              },
            ],
          },
        }),
      };

      const store = makeStore();
      const result = await store.dispatch(
        loadTemplate({ templateId: "t4", api: mockApi, tokens })
      );

      expect(result.type).toBe("clinicalReportTemplate/loadTemplate/fulfilled");
    });
  });

  describe("saveTemplate", () => {
    it("fulfilled on successful save", async () => {
      const mockApi = {
        CreateClinicalReportTemplate: vi.fn().mockResolvedValue({ data: { id: "new1" } }),
        CreateClinicalReportTemplateSections: vi.fn().mockResolvedValue({ data: {} }),
      };

      const store = makeStore();
      const result = await store.dispatch(
        saveTemplate({
          templateData: {
            templateId: null,
            templateMetadata: { title: "New Template" },
            activeSections: [],
            sectionData: {},
          },
          api: mockApi,
          tokens,
        })
      );

      expect(result.type).toBe("clinicalReportTemplate/saveTemplate/fulfilled");
    });

    it("rejected when API fails", async () => {
      const mockApi = {
        CreateClinicalReportTemplate: vi.fn().mockRejectedValue(new Error("Server error")),
      };

      const store = makeStore();
      const result = await store.dispatch(
        saveTemplate({
          templateData: {
            templateId: null,
            templateMetadata: { title: "Fail" },
            activeSections: [],
            sectionData: {},
          },
          api: mockApi,
          tokens,
        })
      );

      expect(result.type).toBe("clinicalReportTemplate/saveTemplate/rejected");
    });

    it("updates existing template", async () => {
      const mockApi = {
        UpdateClinicalReportTemplate: vi.fn().mockResolvedValue({ data: { id: "existing1" } }),
        CreateClinicalReportTemplateSections: vi.fn().mockResolvedValue({ data: {} }),
        UpdateClinicalReportTemplateSection: vi.fn().mockResolvedValue({ data: {} }),
      };

      const store = makeStore();
      const result = await store.dispatch(
        saveTemplate({
          templateData: {
            templateId: "existing1",
            templateMetadata: { title: "Updated" },
            activeSections: [],
            sectionData: {},
          },
          api: mockApi,
          tokens,
        })
      );

      expect(result.type).toBe("clinicalReportTemplate/saveTemplate/fulfilled");
    });
  });
});
