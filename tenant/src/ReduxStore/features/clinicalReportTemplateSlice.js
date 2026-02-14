import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";

// Section configuration
export const SECTIONS_CONFIG = [
  { id: "clientInformation", label: "Client Information" },
  { id: "assessments", label: "Assessments" },
  { id: "targetBehaviours", label: "Target Behaviours" },
  { id: "behaviourStrategies", label: "Behaviour Strategies" },
  { id: "goalsTargets", label: "Goals & Targets" },
  { id: "monitoringData", label: "Monitoring & Data Collection" },
  { id: "implementationNotes", label: "Implementation Notes" },
  { id: "crisisSafety", label: "Crisis & Safety Plan" },
  { id: "generalization", label: "Generalization & Maintenance" },
  { id: "review", label: "Review" },
  { id: "discharge", label: "Discharge" },
  { id: "consentSignatures", label: "Consent & Signatures" },
];

const initialState = {
  templateMetadata: {
    title: "",
    tenantId: null,
    isDraft: true,
  },
  activeSections: [],
  expandedSections: [],
  actionMenuOpen: null,
  activeDragId: null,
  sectionData: {
    clientInformation: {
      clientFullName: "",
      dateOfBirth: "",
      gender: "",
      clientBackground: "",
      diagnoses: [],
      intakeDate: "",
      referralSource: "",
      serviceLocation: "",
      otherClientInformation: "",
    },
    assessments: [],
    targetBehaviours: [],
    behaviourStrategies: [],
    goalsTargets: {},
    monitoringData: {},
    implementationNotes: {},
    crisisSafety: [],
    generalization: {},
    review: {},
    discharge: {},
    consentSignatures: {},
  },
  // Track existing section IDs from loaded template
  existingSectionIds: {},
  mode: "newTemplate",
  templateId: null,
  isLoading: false,
  isSaving: false,
  error: null,
  saveSuccess: false,
};

export const saveTemplate = createAsyncThunk(
  "clinicalReportTemplate/saveTemplate",
  async ({ templateData, api, tokens }, { rejectWithValue, getState }) => {
    try {
      const { accessToken, refreshToken } = tokens;
      const { templateId, templateMetadata, activeSections, sectionData } =
        templateData;

      // Get the current state to access existing section IDs
      const state = getState();
      const existingSectionMap =
        state.clinicalReportTemplate.existingSectionIds || {};

      // Deduplicate by label before sending
      const seen = new Set();
      const uniqueSections = [];

      activeSections.forEach((sectionId, index) => {
        const baseSectionId = sectionId.split("_")[0];
        const sectionConfig = SECTIONS_CONFIG.find(
          (s) => s.id === baseSectionId,
        );
        const label = sectionConfig?.label || baseSectionId;

        if (seen.has(label)) return;
        seen.add(label);

        const data = sectionData[sectionId] || {};
        let content = {};
        if (Array.isArray(data)) {
          content = { items: data };
        } else if (typeof data === "object" && data !== null) {
          content = data;
        } else {
          content = { value: data };
        }

        // Check if this is an existing section (has an ID from loaded template)
        const existingSectionId = existingSectionMap[sectionId];

        // Prepare section payload
        const sectionPayload = {
          section: label,
          content,
          order: index,
        };

        // Only include id if it exists (editing existing section)
        // For new sections or new templates, don't include id
        if (existingSectionId) {
          sectionPayload.id = existingSectionId;
        }

        uniqueSections.push(sectionPayload);
      });

      const payload = {
        tenantId: templateMetadata.tenantId,
        title: templateMetadata.title,
        sections: uniqueSections,
        accessToken,
        refreshToken,
      };

      if (templateId) {
        const response = await api.UpdateClinicalReportTemplate({
          ...payload,
          id: templateId,
          isDraft: templateMetadata.isDraft,
        });
        return response;
      } else {
        const response = await api.CreateClinicalReportTemplate(payload);
        return response;
      }
    } catch (error) {
      return rejectWithValue(error.message || "Failed to save template");
    }
  },
);

export const loadTemplate = createAsyncThunk(
  "clinicalReportTemplate/loadTemplate",
  async ({ templateId, api, tokens }, { rejectWithValue }) => {
    try {
      const { accessToken, refreshToken } = tokens;
      const response = await api.GetSingleClinicalReportTemplateById({
        Id: templateId,
        accessToken,
        refreshToken,
      });

      const templateData = response?.data || response;

      const transformedSections = (templateData.sections || []).map(
        (section, index) => {
          const sectionConfig = SECTIONS_CONFIG.find(
            (s) => s.label === section.section,
          );
          const sectionId =
            sectionConfig?.id ||
            section.section.toLowerCase().replace(/\s+/g, "");

          let content = section.content || {};
          if (content.items && Array.isArray(content.items)) {
            content = content.items;
          } else if (content.value && Object.keys(content).length === 1) {
            content = content.value;
          }

          return {
            sectionId,
            content,
            order: section.order !== undefined ? section.order : index,
            // Store the original section id from the API
            originalSectionId: section.id,
          };
        },
      );

      transformedSections.sort((a, b) => a.order - b.order);

      // Deduplicate on load and track section IDs
      const seen = new Set();
      const dedupedSections = [];
      const existingSectionIds = {};

      transformedSections.forEach((sec) => {
        const baseType = sec.sectionId.split("_")[0];
        if (!seen.has(baseType)) {
          seen.add(baseType);
          dedupedSections.push(sec);
          // Map the deduped sectionId to the original API section id
          existingSectionIds[sec.sectionId] = sec.originalSectionId;
        }
      });

      return {
        id: templateData.id,
        title: templateData.title,
        sections: dedupedSections,
        existingSectionIds,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const clinicalReportTemplateSlice = createSlice({
  name: "clinicalReportTemplate",
  initialState,
  reducers: {
    initializeTemplate: (state, action) => {
      const {
        id,
        title,
        sections,
        mode = "newTemplate",
        tenantId,
        existingSectionIds = {},
      } = action.payload;

      state.templateId = id;
      state.mode = mode;
      state.templateMetadata.tenantId = tenantId;
      state.existingSectionIds = existingSectionIds;

      if (title) state.templateMetadata.title = title;

      if (sections && Array.isArray(sections)) {
        state.activeSections = sections.map((s) => s.sectionId);
        state.expandedSections = [...state.activeSections];

        sections.forEach((section) => {
          if (section.data) state.sectionData[section.sectionId] = section.data;
        });
      }
    },

    updateTemplateTitle: (state, action) => {
      state.templateMetadata.title = action.payload;
    },

    addSection: (state, action) => {
      const sectionId = action.payload;
      if (!SECTIONS_CONFIG.some((s) => s.id === sectionId)) return;

      if (state.activeSections.some((id) => id.split("_")[0] === sectionId))
        return;

      state.activeSections.push(sectionId);
      state.expandedSections.push(sectionId);

      if (!state.sectionData[sectionId]) {
        const type = sectionId;
        const def = initialState.sectionData[type] || {};
        state.sectionData[sectionId] = Array.isArray(def) ? [] : { ...def };
      }
    },

    removeSection: (state, action) => {
      const sectionId = action.payload;
      state.activeSections = state.activeSections.filter(
        (id) => id !== sectionId,
      );
      state.expandedSections = state.expandedSections.filter(
        (id) => id !== sectionId,
      );

      // Also remove from existingSectionIds if present
      if (state.existingSectionIds[sectionId]) {
        delete state.existingSectionIds[sectionId];
      }

      delete state.sectionData[sectionId];
    },

    toggleSectionExpand: (state, action) => {
      const sectionId = action.payload;
      if (state.expandedSections.includes(sectionId)) {
        state.expandedSections = state.expandedSections.filter(
          (id) => id !== sectionId,
        );
      } else {
        state.expandedSections.push(sectionId);
      }
    },

    updateSectionData: (state, action) => {
      const { sectionId, data } = action.payload;

      if (!state.sectionData[sectionId]) {
        const type = sectionId.split("_")[0];
        const def = initialState.sectionData[type] || {};
        state.sectionData[sectionId] = Array.isArray(def) ? [] : { ...def };
      }

      state.sectionData[sectionId] = Array.isArray(data)
        ? data
        : { ...state.sectionData[sectionId], ...data };
    },

    reorderSections: (state, action) => {
      const { activeId, overId } = action.payload;
      const oldIdx = state.activeSections.indexOf(activeId);
      const newIdx = state.activeSections.indexOf(overId);

      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const arr = [...state.activeSections];
      const [moved] = arr.splice(oldIdx, 1);
      arr.splice(newIdx, 0, moved);
      state.activeSections = arr;
      state.activeDragId = null;
    },

    duplicateSection: () => {}, // disabled

    setActionMenuOpen: (state, action) => {
      state.actionMenuOpen = action.payload;
    },

    setActiveDragId: (state, action) => {
      state.activeDragId = action.payload;
    },

    clearTemplate: () => ({ ...initialState }),

    resetSaveStates: (state) => {
      state.isSaving = false;
      state.saveSuccess = false;
      state.error = null;
    },

    // Add a reducer to manually set existing section IDs if needed
    setExistingSectionIds: (state, action) => {
      state.existingSectionIds = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(saveTemplate.pending, (state) => {
        state.isSaving = true;
        state.saveSuccess = false;
        state.error = null;
      })
      .addCase(saveTemplate.fulfilled, (state, action) => {
        state.isSaving = false;
        state.saveSuccess = true;
        const saved = action.payload?.data || action.payload;
        state.templateId = saved?.id || state.templateId;
      })
      .addCase(saveTemplate.rejected, (state, action) => {
        state.isSaving = false;
        state.saveSuccess = false;
        state.error = action.payload;
      })

      .addCase(loadTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        const { title, sections, id, existingSectionIds } = action.payload;

        state.templateMetadata.title = title || "";
        state.templateId = id || state.templateId;
        state.existingSectionIds = existingSectionIds || {};

        // Deduplicate on load
        const seen = new Set();
        const deduped = [];
        sections.forEach((sec) => {
          const base = sec.sectionId.split("_")[0];
          if (seen.has(base)) return;
          seen.add(base);
          deduped.push(sec);
        });

        state.activeSections = deduped.map((s) => s.sectionId);
        state.expandedSections = [...state.activeSections];

        state.sectionData = { ...initialState.sectionData };

        deduped.forEach((sec) => {
          state.sectionData[sec.sectionId] = sec.content;
        });
      })
      .addCase(loadTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  initializeTemplate,
  updateTemplateTitle,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  duplicateSection,
  setActionMenuOpen,
  setActiveDragId,
  clearTemplate,
  resetSaveStates,
  setExistingSectionIds,
} = clinicalReportTemplateSlice.actions;

// Selectors
export const selectTemplateMetadata = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.templateMetadata || initialState.templateMetadata,
);

export const selectActiveSections = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.activeSections || [],
);

export const selectExpandedSections = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.expandedSections || [],
);

export const selectSectionData = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.sectionData || initialState.sectionData,
);

export const selectExistingSectionIds = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.existingSectionIds || {},
);

export const selectTemplateMode = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.mode || "newTemplate",
);

export const selectTemplateId = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.templateId,
);

export const selectActionMenuOpen = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.actionMenuOpen || null,
);

export const selectActiveDragId = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.activeDragId || null,
);

export const selectIsSaving = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.isSaving || false,
);

export const selectSaveSuccess = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.saveSuccess || false,
);

export const selectError = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.error || null,
);

export const selectIsLoading = createSelector(
  (state) => state.clinicalReportTemplate,
  (slice) => slice?.isLoading || false,
);

export const selectActiveSectionsWithData = createSelector(
  [
    selectActiveSections,
    selectSectionData,
    selectExpandedSections,
    selectExistingSectionIds,
  ],
  (activeSections, sectionData, expandedSections, existingSectionIds) => {
    return (activeSections || []).map((sectionId) => ({
      id: sectionId,
      label:
        SECTIONS_CONFIG.find((s) => s.id === sectionId.split("_")[0])?.label ||
        sectionId,
      data: sectionData?.[sectionId] || null,
      isExpanded: expandedSections?.includes(sectionId) || false,
      // Include the API section ID if it exists
      apiSectionId: existingSectionIds?.[sectionId] || null,
    }));
  },
);

export default clinicalReportTemplateSlice.reducer;
