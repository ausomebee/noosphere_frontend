import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from "@reduxjs/toolkit";
import { formatDate } from "../../Helper/Formatters";

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
  metadata: {
    documentTitle: "",
    dateCreated: "",
    approver: "",
    approverId: null,
    createdBy: "",
    creatorId: null,
    lastUpdated: "",
    status: "DRAFT",
    version: "v1",
    client: { name: "", initials: "" },
    clientTenantId: null,
    tenantId: null,
    clientData: null,
    hasChangesRequested: false,
    changeRequestMessage: "",
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
  // Track existing section IDs from loaded report
  existingSectionIds: {},
  mode: "new",
  activeTab: "drafts",
  reportId: null,
  isLoading: false,
  isSaving: false,
  isPublishing: false,
  error: null,
  saveSuccess: false,
  publishSuccess: false,
};


// A deep copy of the empty section data. A shallow spread would hand out the
// same nested objects that live on initialState, so a later edit could mutate
// the defaults for every report created afterwards in the same session.
const freshSectionData = () =>
  JSON.parse(JSON.stringify(initialState.sectionData));

/**
 * Most recent change request in a list, by createdAt.
 *
 * Falls back to the last element when timestamps are missing, since APIs that
 * omit them almost always append.
 */
export const newestChangeRequest = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) return null;
  const withDates = requests.filter((r) => r?.createdAt);
  if (withDates.length === 0) return requests[requests.length - 1];
  return withDates.reduce((latest, r) =>
    new Date(r.createdAt) > new Date(latest.createdAt) ? r : latest,
  );
};

export const saveDraft = createAsyncThunk(
  "clinicalReport/saveDraft",
  async ({ reportData, api, tokens }, { rejectWithValue, getState }) => {
    try {
      const { accessToken, refreshToken } = tokens;
      const { reportId, metadata, activeSections, sectionData } = reportData;

      // Get existing section IDs from state
      const state = getState();
      const existingSectionMap = state.clinicalReport.existingSectionIds || {};

      const sections = activeSections.map((sectionId, index) => {
        const base = sectionId.split("_")[0];
        const cfg = SECTIONS_CONFIG.find((s) => s.id === base);
        const data = sectionData[sectionId] || {};

        let content = Array.isArray(data)
          ? { items: data }
          : typeof data === "object" && data !== null
            ? data
            : { value: data };

        // Check if this is an existing section
        const existingSectionId = existingSectionMap[sectionId];

        // Prepare section payload
        const sectionPayload = {
          section: cfg?.label || base,
          content,
          order: index,
        };

        // Only include id if it exists (editing existing section)
        if (existingSectionId) {
          sectionPayload.id = existingSectionId;
        }

        return sectionPayload;
      });

      // Auto-append Consent & Signatures as the last section if not already present
      const hasConsent = sections.some(
        (s) => s.section === "Consent & Signatures",
      );
      if (!hasConsent) {
        sections.push({
          section: "Consent & Signatures",
          content: sectionData["consentSignatures"] || {},
          order: sections.length,
        });
      }

      const payload = {
        tenantId: metadata.tenantId,
        clientTenantId: metadata.clientTenantId,
        creatorId: metadata.creatorId,
        approverId: metadata.approverId,
        title: metadata.documentTitle,
        status: "DRAFT",
        sections,
        accessToken,
        refreshToken,
      };

      if (reportId) {
        return await api.UpdateClinicalReport({ ...payload, id: reportId });
      } else {
        return await api.CreateClinicalReport(payload);
      }
    } catch (error) {
      return rejectWithValue(error.message || "Save draft failed");
    }
  },
);

export const publishReport = createAsyncThunk(
  "clinicalReport/publishReport",
  async ({ reportData, api, tokens }, { rejectWithValue, getState }) => {
    try {
      const { accessToken, refreshToken } = tokens;
      const { reportId, metadata, activeSections, sectionData } = reportData;

      // Get existing section IDs from state
      const state = getState();
      const existingSectionMap = state.clinicalReport.existingSectionIds || {};

      const sections = activeSections.map((sectionId, index) => {
        const base = sectionId.split("_")[0];
        const cfg = SECTIONS_CONFIG.find((s) => s.id === base);
        const data = sectionData[sectionId] || {};

        let content = Array.isArray(data)
          ? { items: data }
          : typeof data === "object" && data !== null
            ? data
            : { value: data };

        // Check if this is an existing section
        const existingSectionId = existingSectionMap[sectionId];

        // Prepare section payload
        const sectionPayload = {
          section: cfg?.label || base,
          content,
          order: index,
        };

        // Only include id if it exists (editing existing section)
        if (existingSectionId) {
          sectionPayload.id = existingSectionId;
        }

        return sectionPayload;
      });

      // Auto-append Consent & Signatures as the last section if not already present
      const hasConsent = sections.some(
        (s) => s.section === "Consent & Signatures",
      );
      if (!hasConsent) {
        sections.push({
          section: "Consent & Signatures",
          content: sectionData["consentSignatures"] || {},
          order: sections.length,
        });
      }

      const payload = {
        tenantId: metadata.tenantId,
        clientTenantId: metadata.clientTenantId,
        creatorId: metadata.creatorId,
        approverId: metadata.approverId,
        title: metadata.documentTitle,
        status: "SUBMITTED", // or "publish" — adjust as per your API
        sections,
        accessToken,
        refreshToken,
      };

      if (reportId) {
        return await api.UpdateClinicalReport({ ...payload, id: reportId });
      } else {
        return await api.CreateClinicalReport(payload);
      }
    } catch (error) {
      return rejectWithValue(error.message || "Publish failed");
    }
  },
);

export const loadReport = createAsyncThunk(
  "clinicalReport/loadReport",
  async ({ reportId, api, tokens }, { rejectWithValue }) => {
    try {
      const { accessToken, refreshToken } = tokens;
      const response = await api.GetSingleClinicalReportById({
        Id: reportId,
        accessToken,
        refreshToken,
      });

      const data = response?.data || response;

      const transformed = (data.sections || []).map((sec, idx) => {
        const cfg = SECTIONS_CONFIG.find((s) => s.label === sec.section);
        const sid = cfg?.id || sec.section.toLowerCase().replace(/\s+/g, "");

        let cnt = sec.content || {};
        if (cnt.items) cnt = cnt.items;

        return {
          sectionId: sid,
          content: cnt,
          order: sec.order ?? idx,
          // Store the original section id from the API
          originalSectionId: sec.id,
        };
      });

      transformed.sort((a, b) => a.order - b.order);

      // Deduplicate loaded sections (keep first occurrence) and track section IDs
      const seen = new Set();
      const deduped = [];
      const existingSectionIds = {};

      transformed.forEach((s) => {
        const bt = s.sectionId.split("_")[0];
        if (seen.has(bt)) return;
        seen.add(bt);
        deduped.push(s);
        // Map the deduped sectionId to the original API section id
        existingSectionIds[s.sectionId] = s.originalSectionId;
      });

      const metadata = {
        documentTitle: data.title || "",
        dateCreated: data.createdAt
          ? formatDate(data.createdAt)
          : "",
        approver: data.approver?.fullName || "",
        approverId: data.approverId || null,
        createdBy: data.creator?.fullName || "",
        creatorId: data.creatorId || null,
        lastUpdated: data.updatedAt
          ? formatDate(data.updatedAt)
          : "",
        status: data.status || "DRAFT",
        version: "v1",
        client: {
          name: data.client?.client
            ? `${data.client.client.firstName || ""} ${data.client.client.lastName || ""}`.trim()
            : "",
          initials: data.client?.client
            ? `${data.client.client.firstName?.[0] || ""}${data.client.client.lastName?.[0] || ""}`.toUpperCase()
            : "??",
        },
        clientTenantId: data.clientTenantId || null,
        tenantId: data.tenantId || null,
        clientData: data.client || null,
        hasChangesRequested:
          (data.clinicalReportChangeRequests &&
            data.clinicalReportChangeRequests.length > 0) ||
          data.status === "CHANGES_REQUESTED",
        // Sorted rather than taking [0]: the array arrives in the API's own
        // order, so the banner was showing whichever request happened to be
        // first — the oldest — instead of the one the clinician needs to act on.
        changeRequestMessage:
          newestChangeRequest(data.clinicalReportChangeRequests)?.description ||
          (data.status === "CHANGES_REQUESTED"
            ? "Changes requested for this document."
            : ""),
      };

      return {
        id: data.id,
        metadata,
        sections: deduped,
        existingSectionIds,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

const slice = createSlice({
  name: "clinicalReport",
  initialState,
  reducers: {
    initializeReport(state, { payload }) {
      const {
        id,
        metadata,
        formData,
        mode = "new",
        activeTab = "drafts",
        existingSectionIds = {},
      } = payload;

      // The builder state is persisted, so whatever the last report left behind
      // is still here. Starting a different document — or any new one — has to
      // clear it, otherwise the previous report's sections carry over. That was
      // possible across clients too: metadata was replaced so the header showed
      // the new client while the clinical content underneath belonged to the
      // previous one.
      const meta0 = metadata || formData?.metadata;
      const incomingReportId = id ?? null;
      const incomingClient = meta0?.clientTenantId ?? null;
      const isDifferentDocument =
        mode === "new" ||
        state.reportId !== incomingReportId ||
        state.metadata?.clientTenantId !== incomingClient;

      if (isDifferentDocument) {
        state.sectionData = freshSectionData();
        state.activeSections = [];
        state.expandedSections = [];
        state.existingSectionIds = {};
      }

      state.reportId = id;
      state.mode = mode;
      state.activeTab = activeTab;
      state.existingSectionIds = existingSectionIds;

      if (metadata || formData?.metadata) {
        const meta = metadata || formData.metadata;
        state.metadata = {
          documentTitle: meta.documentTitle || "Behaviour Intervention Plan",
          dateCreated:
            meta.dateCreated || formatDate(new Date()),
          approver: meta.approver || "",
          approverId: meta.approverId || null,
          createdBy: meta.createdBy || "",
          creatorId: meta.creatorId || null,
          lastUpdated: formatDate(new Date()),
          status: mode === "view" ? "APPROVED" : "DRAFT",
          version: "v1",
          client: meta.client || { name: "", initials: "" },
          clientTenantId: meta.clientTenantId || null,
          tenantId: meta.tenantId || null,
          clientData: meta.clientData || null,
          hasChangesRequested: meta.hasChangesRequested || false,
          changeRequestMessage: meta.changeRequestMessage || "",
        };
      }

      // Replaces rather than merges — merging let a section the incoming
      // document doesn't have keep the previous document's content.
      if (formData?.sectionData) {
        state.sectionData = {
          ...freshSectionData(),
          ...formData.sectionData,
        };
      }

      if (formData?.activeSections) {
        state.activeSections = formData.activeSections;
        state.expandedSections =
          formData.expandedSections || formData.activeSections;
      }
    },

    addSection(state, { payload: sectionId }) {
      if (!SECTIONS_CONFIG.some((s) => s.id === sectionId)) return;
      if (state.activeSections.includes(sectionId)) return;

      state.activeSections.push(sectionId);
      state.expandedSections.push(sectionId);

      if (!state.sectionData[sectionId]) {
        const def = initialState.sectionData[sectionId] || {};
        state.sectionData[sectionId] = Array.isArray(def) ? [] : { ...def };
      }
    },

    removeSection(state, { payload: sectionId }) {
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
      state.metadata.lastUpdated = formatDate(new Date());
    },

    toggleSectionExpand(state, { payload: sectionId }) {
      if (state.expandedSections.includes(sectionId)) {
        state.expandedSections = state.expandedSections.filter(
          (id) => id !== sectionId,
        );
      } else {
        state.expandedSections.push(sectionId);
      }
    },

    updateSectionData(state, { payload: { sectionId, data } }) {
      if (!state.sectionData[sectionId]) {
        const type = sectionId.split("_")[0];
        const def = initialState.sectionData[type] || {};
        state.sectionData[sectionId] = Array.isArray(def) ? [] : { ...def };
      }

      state.sectionData[sectionId] = Array.isArray(data)
        ? data
        : { ...state.sectionData[sectionId], ...data };
      state.metadata.lastUpdated = formatDate(new Date());
    },

    reorderSections(state, { payload: { activeId, overId } }) {
      const oldIdx = state.activeSections.indexOf(activeId);
      const newIdx = state.activeSections.indexOf(overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const arr = [...state.activeSections];
      const [moved] = arr.splice(oldIdx, 1);
      arr.splice(newIdx, 0, moved);
      state.activeSections = arr;
      state.activeDragId = null;
    },

    // Duplicate intentionally removed — no duplicateSection reducer

    updateMetadata(state, { payload }) {
      state.metadata = { ...state.metadata, ...payload };
      state.metadata.lastUpdated = formatDate(new Date());
    },

    setActionMenuOpen(state, { payload }) {
      state.actionMenuOpen = payload;
    },

    setActiveDragId(state, { payload }) {
      state.activeDragId = payload;
    },

    // Add a reducer to manually set existing section IDs if needed
    setExistingSectionIds(state, { payload }) {
      state.existingSectionIds = payload;
    },

    // Full wipe back to empty. The shallow spread here shared initialState's
    // nested section objects by reference, so a later edit could mutate the
    // defaults themselves.
    clearForm: () => ({ ...initialState, sectionData: freshSectionData() }),

    resetSaveStates(state) {
      state.isSaving = false;
      state.isPublishing = false;
      state.saveSuccess = false;
      state.publishSuccess = false;
      state.error = null;
    },
  },

  extraReducers: (b) => {
    b.addCase(saveDraft.pending, (s) => {
      s.isSaving = true;
      s.saveSuccess = false;
      s.error = null;
    })
      .addCase(saveDraft.fulfilled, (s, a) => {
        s.isSaving = false;
        s.saveSuccess = true;
        s.reportId = a.payload?.id || s.reportId;
        s.metadata.status = "DRAFT";
      })
      .addCase(saveDraft.rejected, (s, a) => {
        s.isSaving = false;
        s.saveSuccess = false;
        s.error = a.payload;
      })

      .addCase(publishReport.pending, (s) => {
        s.isPublishing = true;
        s.publishSuccess = false;
        s.error = null;
      })
      .addCase(publishReport.fulfilled, (s) => {
        s.isPublishing = false;
        s.publishSuccess = true;
        s.metadata.status = "SUBMITTED"; // or "Pending Approval" — adjust as needed
      })
      .addCase(publishReport.rejected, (s, a) => {
        s.isPublishing = false;
        s.publishSuccess = false;
        s.error = a.payload;
      })

      .addCase(loadReport.pending, (s) => {
        s.isLoading = true;
        s.error = null;
        // Cleared up front rather than on success: if the load fails the
        // builder would otherwise sit there showing the previously opened
        // report's sections under the new report's heading. The UI shows a
        // loader while isLoading, so nothing flashes empty.
        s.sectionData = freshSectionData();
        s.activeSections = [];
        s.expandedSections = [];
        s.existingSectionIds = {};
      })
      .addCase(loadReport.fulfilled, (s, a) => {
        s.isLoading = false;
        const { metadata, sections, id, existingSectionIds } = a.payload;

        if (metadata) s.metadata = metadata;
        s.reportId = id || s.reportId;
        s.existingSectionIds = existingSectionIds || {};

        // Deduplicate loaded sections
        const seen = new Set();
        const deduped = [];
        sections.forEach((sec) => {
          const bt = sec.sectionId.split("_")[0];
          if (seen.has(bt)) return;
          seen.add(bt);
          deduped.push(sec);
        });

        s.activeSections = deduped.map((s) => s.sectionId);
        s.expandedSections = [...s.activeSections];

        s.sectionData = freshSectionData();
        deduped.forEach((sec) => {
          s.sectionData[sec.sectionId] = sec.content;
        });
      })
      .addCase(loadReport.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.payload;
      });
  },
});

export const {
  initializeReport,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  updateMetadata,
  setActionMenuOpen,
  setActiveDragId,
  setExistingSectionIds,
  clearForm,
  resetSaveStates,
} = slice.actions;

// Selectors
export const selectMetadata = (s) =>
  s.clinicalReport?.metadata || initialState.metadata;
export const selectActiveSections = (s) =>
  s.clinicalReport?.activeSections || [];
export const selectExpandedSections = (s) =>
  s.clinicalReport?.expandedSections || [];
export const selectSectionData = (s) =>
  s.clinicalReport?.sectionData || initialState.sectionData;
export const selectExistingSectionIds = (s) =>
  s.clinicalReport?.existingSectionIds || {};
export const selectMode = (s) => s.clinicalReport?.mode || "new";
export const selectReportId = (s) => s.clinicalReport?.reportId;
export const selectActionMenuOpen = (s) => s.clinicalReport?.actionMenuOpen;
export const selectActiveDragId = (s) => s.clinicalReport?.activeDragId;
export const selectIsSaving = (s) => s.clinicalReport?.isSaving || false;
export const selectIsPublishing = (s) =>
  s.clinicalReport?.isPublishing || false;
export const selectSaveSuccess = (s) => s.clinicalReport?.saveSuccess || false;
export const selectPublishSuccess = (s) =>
  s.clinicalReport?.publishSuccess || false;
export const selectError = (s) => s.clinicalReport?.error;
export const selectActiveSectionsWithData = createSelector(
  [
    selectActiveSections,
    selectSectionData,
    selectExpandedSections,
    selectExistingSectionIds,
  ],
  (active, data, expanded, existingSectionIds) =>
    (active || []).map((id) => ({
      id,
      label:
        SECTIONS_CONFIG.find((s) => s.id === id.split("_")[0])?.label || id,
      data: data?.[id] || null,
      isExpanded: expanded?.includes(id) || false,
      // Include the API section ID if it exists
      apiSectionId: existingSectionIds?.[id] || null,
    })),
);

export default slice.reducer;
