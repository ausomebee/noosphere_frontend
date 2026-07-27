// ClinicalReportBuilder.jsx
import React, { useEffect, useCallback, useState, useMemo } from "react";
import LoadingSpinner from "../../../../../../Components/LoadingSpinner";
import { useSelector, useDispatch } from "react-redux";
import useAuth from "../../../../../../hooks/useAuth";
import usePermissions from "../../../../../../hooks/usePermissions";
import { GrDrag } from "react-icons/gr";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronLeft, FaExternalLinkAlt, FaEllipsisV } from "react-icons/fa";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./ClinicalReportBuilder.css";


import ClientInformationSection from "./DocumentSections/ClientInformationSection/ClientInformationSection";
import AssessmentsSection from "./DocumentSections/AssessmentsSections/AssessmentsSection";
import TargetBehavioursSection from "./DocumentSections/TargetBehavioursSections/TargetBehavioursSection";
import BehaviourStrategiesSection from "./DocumentSections/BehaviourStrategiesSection/BehaviourStrategiesSection";
import GoalsTargetsSection from "./DocumentSections/GoalsTargetsSection/GoalsTargetsSection";
import MonitoringDataSection from "./DocumentSections/MonitoringDataSection/MonitoringDataSection";
import ImplementationNotesSection from "./DocumentSections/ImplementationNotesSection/ImplementationNotesSection";
import CrisisSafetySection from "./DocumentSections/CrisisSafetySection/CrisisSafetySection";
import GeneralizationSection from "./DocumentSections/GeneralizationSection/GeneralizationSection";
import ReviewSection from "./DocumentSections/ReviewSection/ReviewSection";
import DischargeSection from "./DocumentSections/DischargeSection/DischargeSection";
import ConsentSignaturesSection from "./DocumentSections/ConsentSignaturesSection/ConsentSignaturesSection";
import { showToast } from "../../../../../../Helper/ShowToast";
import Button from "../../../../../../Components/Button/Button";
import Alert from "../../../../../../Components/Alert/Alert";
import ReusableModal from "../../../../../../Components/ReusableModal/ReusableModal";
import { TextareaInput } from "../../../../../../Components/Input/Inputs";
import api from "../../../../../../api/TemplateAndReportApi";
import {
  formatDate,
  formatDateTime,
  formatGender,
} from "../../../../../../Helper/Formatters";
import useFormatSettings from "../../../../../../hooks/useFormatSettings";

import {
  initializeReport,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  setActionMenuOpen,
  setActiveDragId,
  saveDraft,
  publishReport,
  selectMetadata,
  selectActiveSections,
  selectExpandedSections,
  selectSectionData,
  selectActionMenuOpen,
  selectActiveDragId,
  selectIsSaving,
  selectIsPublishing,
  selectSaveSuccess,
  selectPublishSuccess,
  selectError,
  selectActiveSectionsWithData,
  selectReportId,
  loadReport,
  resetSaveStates,
  SECTIONS_CONFIG,
} from "../../../../../../ReduxStore/features/clinicalReportSlice";

// SECTION_COMPONENTS (must be before use)
const SECTION_COMPONENTS = {
  clientInformation: ClientInformationSection,
  assessments: AssessmentsSection,
  targetBehaviours: TargetBehavioursSection,
  behaviourStrategies: BehaviourStrategiesSection,
  goalsTargets: GoalsTargetsSection,
  monitoringData: MonitoringDataSection,
  implementationNotes: ImplementationNotesSection,
  crisisSafety: CrisisSafetySection,
  generalization: GeneralizationSection,
  review: ReviewSection,
  discharge: DischargeSection,
  consentSignatures: ConsentSignaturesSection,
};

// Helper function to format client data for auto-population
const getAutoPopulatedClientData = (clientData) => {
  if (!clientData) return {};

  // Try to find the client object in the structure from your data
  let client = null;

  // Check if clientData has a client property (your structure shows clientData.client)
  if (clientData.client) {
    client = clientData.client;
  }
  // Check if it's nested in clientData
  else if (clientData.clientData && clientData.clientData.client) {
    client = clientData.clientData.client;
  }
  // Maybe clientData itself is the client object
  else {
    client = clientData;
  }

  if (!client) {
    return {};
  }

  // Get full name from client object
  const getFullName = () => {
    const firstName = client.firstName || "";
    const lastName = client.lastName || "";
    const preferredName = client.preferredName
      ? ` (${client.preferredName})`
      : "";
    return `${firstName} ${lastName}${preferredName}`.trim();
  };

  // Create address string
  const getAddress = () => {
    const address =
      `${client.streetAddress || ""}, ${client.city || ""}, ${client.state || ""}, ${client.country || ""}`
        .replace(/, ,/g, ",")
        .replace(/^, |, $/g, "")
        .trim();
    return address || "";
  };

  return {
    clientFullName: getFullName(),
    dateOfBirth: formatDate(client.DOB),
    gender: formatGender(client.gender),
    clientId: client.id || "",
    email: client.email || "",
    phoneNumber: client.phoneNumber || "",
    address: getAddress(),
    payer: client.payer?.payerName || "N/A",
    createdAt: formatDate(client.createdAt),
    // Add all other client fields that might be useful
    preferredName: client.preferredName || "",
    city: client.city || "",
    state: client.state || "",
    country: client.country || "",
    zipCode: client.zipCode || "",
    caregiverName: client.caregiverName || "",
    caregiverEmail: client.caregiverEmail || "",
    caregiverPhone: client.caregiverPhone || "",
    caregiverRelationship: client.caregiverRelationship || "",
  };
};

// Remove Section Confirmation Modal
const RemoveSectionConfirmModal = ({
  isOpen,
  sectionLabel,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "16px",
            color: "#1f2937",
          }}
        >
          Remove Section
        </h3>
        <p
          style={{ color: "#4b5563", marginBottom: "24px", lineHeight: "1.5" }}
        >
          Are you sure you want to remove{" "}
          <span style={{ fontWeight: 500, color: "#dc2626" }}>
            "{sectionLabel}"
          </span>
          ?<br />
          This action cannot be undone.
        </p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              color: "#4b5563",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#b91c1c")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#dc2626")
            }
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

// Unsaved Changes Modal (back navigation)
const UnsavedChangesModal = ({ isOpen, onConfirmLeave, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "16px",
            color: "#1f2937",
          }}
        >
          Unsaved Changes
        </h3>
        <p
          style={{ color: "#4b5563", marginBottom: "24px", lineHeight: "1.5" }}
        >
          You have unsaved changes in this report. Leaving now will discard
          them.
          <br />
          Are you sure you want to leave?
        </p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              color: "#4b5563",
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Stay
          </button>
          <button
            onClick={onConfirmLeave}
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#b91c1c")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#dc2626")
            }
          >
            Leave Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

const SortableSectionCard = React.memo(
  ({
    sectionId,
    section,
    isExpanded,
    sectionData,
    actionMenuOpen,
    onToggleExpand,
    onActionMenu,
    onSectionAction,
    onDataChange,
    canEditInputs,
    canAddSections,
    clientData,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: sectionId, disabled: !canAddSections });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const sectionType = sectionId.split("_")[0];
    const SectionComponent = SECTION_COMPONENTS[sectionType];

    // Memoize the auto-populated data to prevent unnecessary re-calculations
    const autoPopulatedData = useMemo(() => {
      return sectionType === "clientInformation"
        ? getAutoPopulatedClientData(clientData)
        : {};
    }, [sectionType, clientData]);

    // Combine sectionData with auto-populated data
    const combinedData = useMemo(() => {
      if (sectionType === "clientInformation") {
        // For clientInformation, merge auto-populated data with existing data
        // Auto-populated data should only fill in empty fields
        const combined = { ...autoPopulatedData };

        // Override with user-entered data from sectionData
        // But keep auto-populated values for fields that user hasn't modified
        if (sectionData) {
          Object.keys(sectionData).forEach((key) => {
            // Only override if the user has actually entered something
            if (sectionData[key] !== undefined && sectionData[key] !== "") {
              combined[key] = sectionData[key];
            }
          });
        }

        return combined;
      }
      return sectionData || {};
    }, [sectionType, autoPopulatedData, sectionData]);

    return (
      <div ref={setNodeRef} style={style} className="crb-section-card">
        <div
          className="crb-section-header"
          onClick={() => onToggleExpand(sectionId)}
        >
          <div className="crb-section-header-left">
            {canAddSections && (
              <button
                className="crb-drag-handle"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GrDrag />
              </button>
            )}
            <h3 className="crb-section-title">{section.label}</h3>
          </div>

          {canAddSections && (
            <div className="crb-section-actions">
              <button
                className="crb-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onActionMenu(actionMenuOpen === sectionId ? null : sectionId);
                }}
              >
                <FaEllipsisV size={18} />
              </button>

              {actionMenuOpen === sectionId && (
                <div className="crb-action-menu">
                  <button
                    className="crb-action-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSectionAction(
                        sectionId,
                        isExpanded ? "minimize" : "expand",
                      );
                    }}
                  >
                    {isExpanded ? "Minimize Section" : "Expand Section"}
                  </button>
                  <button
                    className="crb-action-menu-item danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSectionAction(sectionId, "remove");
                    }}
                  >
                    Remove Section
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`crb-section-content ${!isExpanded ? "collapsed" : ""}`}
        >
          {SectionComponent && (
            <SectionComponent
              data={combinedData}
              onChange={(data) => onDataChange(sectionId, data)}
              isReadOnly={!canEditInputs}
              onRemoveSection={() => onSectionAction(sectionId, "remove")}
            />
          )}
        </div>
      </div>
    );
  },
);
SortableSectionCard.displayName = "SortableSectionCard";

const ClinicalReportBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const { dateFormat, timeFormat } = useFormatSettings();

  const {
    id: reportId,
    metadata: initialMetadata,
    formData,
    mode = "new",
    activeTab = "drafts",
  } = location.state || {};



  const metadata = useSelector(selectMetadata);
  const activeSections = useSelector(selectActiveSections);
  const expandedSections = useSelector(selectExpandedSections);
  const sectionData = useSelector(selectSectionData);
  const actionMenuOpen = useSelector(selectActionMenuOpen);
  const activeDragId = useSelector(selectActiveDragId);
  const isSaving = useSelector(selectIsSaving);
  const isPublishing = useSelector(selectIsPublishing);
  const isLoading = useSelector(
    (state) => state.clinicalReport?.isLoading || false,
  );
  const saveSuccess = useSelector(selectSaveSuccess);
  const publishSuccess = useSelector(selectPublishSuccess);
  const error = useSelector(selectError);
  const sectionsWithData = useSelector(selectActiveSectionsWithData);
  const storedReportId = useSelector(selectReportId);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [sectionToRemove, setSectionToRemove] = useState(null);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);

  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] =
    useState(false);
  const [changeRequestText, setChangeRequestText] = useState("");
  const [changeRequestLoading, setChangeRequestLoading] = useState(false);
  const [isViewChangeModalOpen, setIsViewChangeModalOpen] = useState(false);
  const [changeRequests, setChangeRequests] = useState([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const [isEditingAfterSigned, setIsEditingAfterSigned] = useState(false);
  const [isRevertingToDraft, setIsRevertingToDraft] = useState(false);

  const isReadOnly =
    mode === "submittedForApproval" ||
    mode === "awaitingSignature" ||
    (mode === "clientSigned" && !isEditingAfterSigned);
  const canEditInputs = !isReadOnly;
  const canAddSections = !isReadOnly;

  // Get client data from metadata
  // When loading from API, metadata.clientData may lack DOB/gender,
  // so merge with initialMetadata.clientData (from location.state) which has full client profile
  const clientData = useMemo(() => {
    const apiData = metadata?.clientData;
    const navData = initialMetadata?.clientData;

    if (!apiData && !navData) return null;
    if (!apiData) return navData;
    if (!navData) return apiData;

    // Merge: use navData as base (has full client profile), override with apiData
    const mergedClient = {
      ...(navData?.client || {}),
      ...(apiData?.client || {}),
    };

    // Preserve DOB and gender from navData if apiData doesn't have them
    if (!mergedClient.DOB && navData?.client?.DOB) {
      mergedClient.DOB = navData.client.DOB;
    }
    if (!mergedClient.gender && navData?.client?.gender) {
      mergedClient.gender = navData.client.gender;
    }

    return { ...apiData, ...navData, client: mergedClient };
  }, [metadata?.clientData, initialMetadata?.clientData]);


  // Only approver in submittedForApproval can request changes
  const canRequestChange = mode === "submittedForApproval";

  // Show view request if there's an active change request
  const showViewChangeRequest = metadata?.hasChangesRequested === true;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Add a ref to track initialization
  const initializedRef = React.useRef(false);

  useEffect(() => {
    // Skip if already initialized
    if (initializedRef.current) return;

    const shouldLoadFromAPI =
      (mode === "edit" ||
        mode === "view" ||
        mode === "submittedForApproval" ||
        mode === "awaitingSignature" ||
        mode === "changeRequested" ||
        mode === "clientSigned") &&
      reportId;

    if (shouldLoadFromAPI) {
      dispatch(
        loadReport({ reportId, api, tokens: { accessToken, refreshToken } }),
      );
      initializedRef.current = true;
    } else if (initialMetadata || formData || mode) {
      dispatch(
        initializeReport({
          id: reportId,
          metadata: initialMetadata,
          formData,
          mode,
          activeTab,
        }),
      );
      initializedRef.current = true;
    }
  }, [
    reportId,
    mode,
    dispatch,
    accessToken,
    refreshToken,
    initialMetadata,
    formData,
    activeTab,
  ]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimerRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (saveSuccess) {
      showToast("Draft saved successfully!");
      navigate(-1);
      dispatch(resetSaveStates());
    }
    if (publishSuccess) {
      showToast("Published for approval!");
      navigate(-1);
      dispatch(resetSaveStates());
    }
    if (error) showToast("Something went wrong. Please try again.", "error");
  }, [saveSuccess, publishSuccess, error, navigate, dispatch]);

  const handleAddSection = useCallback(
    (sectionId) => canAddSections && dispatch(addSection(sectionId)),
    [dispatch, canAddSections],
  );

  const handleToggleExpand = useCallback(
    (sectionId) => dispatch(toggleSectionExpand(sectionId)),
    [dispatch],
  );

  const handleActionMenu = useCallback(
    (id) => dispatch(setActionMenuOpen(id)),
    [dispatch],
  );

  // Debounce Redux updates to prevent re-renders on every keystroke
  const pendingUpdatesRef = React.useRef({});
  const debounceTimerRef = React.useRef({});

  const handleSectionDataChange = useCallback(
    (sectionId, data) => {
      const isClientInfo = sectionId.split("_")[0] === "clientInformation";
      if (!canEditInputs && !isClientInfo) return;

      // Store the latest data
      pendingUpdatesRef.current[sectionId] = data;

      // Clear previous timer for this section
      if (debounceTimerRef.current[sectionId]) {
        clearTimeout(debounceTimerRef.current[sectionId]);
      }

      // Debounce: dispatch after 300ms of inactivity
      debounceTimerRef.current[sectionId] = setTimeout(() => {
        const latestData = pendingUpdatesRef.current[sectionId];
        if (latestData) {
          dispatch(updateSectionData({ sectionId, data: latestData }));
          delete pendingUpdatesRef.current[sectionId];
        }
      }, 300);
    },
    [dispatch, canEditInputs],
  );

  // Flush pending updates before save/publish
  const flushPendingUpdates = useCallback(() => {
    Object.entries(pendingUpdatesRef.current).forEach(([sectionId, data]) => {
      dispatch(updateSectionData({ sectionId, data }));
    });
    pendingUpdatesRef.current = {};
    Object.values(debounceTimerRef.current).forEach(clearTimeout);
    debounceTimerRef.current = {};
  }, [dispatch]);

  const handleSectionAction = useCallback(
    (sectionId, action) => {
      if (!canAddSections) return;
      dispatch(setActionMenuOpen(null));

      switch (action) {
        case "minimize":
        case "expand":
          dispatch(toggleSectionExpand(sectionId));
          break;
        case "remove":
        {
          const base = sectionId.split("_")[0];
          const label =
            SECTIONS_CONFIG.find((s) => s.id === base)?.label || "this section";
          setSectionToRemove({ id: sectionId, label });
          setRemoveModalOpen(true);
          break;
        }
        default:
          break;
      }
    },
    [dispatch, canAddSections],
  );

  const confirmRemove = useCallback(() => {
    if (!sectionToRemove) return;
    dispatch(removeSection(sectionToRemove.id));
    showToast(`"${sectionToRemove.label}" removed successfully`);
    setRemoveModalOpen(false);
    setSectionToRemove(null);
  }, [dispatch, sectionToRemove]);

  const cancelRemove = useCallback(() => {
    setRemoveModalOpen(false);
    setSectionToRemove(null);
  }, []);

  const handleDragStart = useCallback(
    (event) => canAddSections && dispatch(setActiveDragId(event.active.id)),
    [dispatch, canAddSections],
  );

  const handleDragEnd = useCallback(
    (event) => {
      if (!canAddSections) return;
      const { active, over } = event;
      if (active.id !== over?.id) {
        dispatch(reorderSections({ activeId: active.id, overId: over.id }));
      } else {
        dispatch(setActiveDragId(null));
      }
    },
    [dispatch, canAddSections],
  );

  const handleDragCancel = useCallback(
    () => dispatch(setActiveDragId(null)),
    [dispatch],
  );

  const handleSaveDraft = useCallback(() => {
    // Flush any pending debounced updates before saving
    flushPendingUpdates();

    // Merge pending data with current Redux sectionData
    const mergedSectionData = { ...sectionData, ...pendingUpdatesRef.current };

    const reportData = {
      reportId: storedReportId,
      metadata,
      activeSections,
      sectionData: mergedSectionData,
    };
    dispatch(
      saveDraft({ reportData, api, tokens: { accessToken, refreshToken } }),
    );
  }, [
    storedReportId,
    metadata,
    activeSections,
    sectionData,
    accessToken,
    refreshToken,
    dispatch,
    flushPendingUpdates,
  ]);

  const handlePublish = useCallback(() => {
    // Flush any pending debounced updates before publishing
    flushPendingUpdates();

    const mergedSectionData = { ...sectionData, ...pendingUpdatesRef.current };

    const reportData = {
      reportId: storedReportId,
      metadata,
      activeSections,
      sectionData: mergedSectionData,
    };
    dispatch(
      publishReport({ reportData, api, tokens: { accessToken, refreshToken } }),
    );
  }, [
    storedReportId,
    metadata,
    activeSections,
    sectionData,
    accessToken,
    refreshToken,
    dispatch,
    flushPendingUpdates,
  ]);

  // ────────────────────────────────────────────────
  // Request Change Modal – ONLY approver in submittedForApproval
  // ────────────────────────────────────────────────
  const handleRequestChange = useCallback(() => {
    if (!canRequestChange) return;
    setChangeRequestText("");
    setIsChangeRequestModalOpen(true);
  }, [canRequestChange]);

  const handleSaveChangeRequest = useCallback(async () => {
    if (!changeRequestText.trim()) {
      showToast("Please enter a comment or request", "warning");
      return;
    }

    setChangeRequestLoading(true);
    try {
      await api.CreateClinicalReportChangeRequest({
        clinicalReportId: storedReportId,
        description: changeRequestText,
        approverId: metadata?.approverId,
        accessToken,
        refreshToken,
      });

      showToast("Change request submitted successfully!", "success");
      setIsChangeRequestModalOpen(false);
      setChangeRequestText("");
      navigate(-1);
    } catch {
      showToast("Failed to submit change request", "error");
    } finally {
      setChangeRequestLoading(false);
    }
  }, [changeRequestText, storedReportId, metadata, accessToken, refreshToken, navigate]);

  // Fetch change requests for the View modal
  const fetchChangeRequests = useCallback(async () => {
    if (!storedReportId) return;
    setChangeRequestsLoading(true);
    try {
      const response = await api.GetAllClinicalReportChangeRequests({
        reportId: storedReportId,
        accessToken,
        refreshToken,
      });
      setChangeRequests(response?.data || []);
    } catch (err) {
      console.error("Failed to fetch change requests:", err);
    } finally {
      setChangeRequestsLoading(false);
    }
  }, [storedReportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewChangeRequest = useCallback(() => {
    fetchChangeRequests();
    setIsViewChangeModalOpen(true);
  }, [fetchChangeRequests]);

  // Approve document
  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await api.ApproveClinicalReport({
        clinicalReportId: storedReportId,
        accessToken,
        refreshToken,
      });
      showToast("Document approved successfully!", "success");
      navigate(-1);
    } catch {
      showToast("Failed to approve document", "error");
    } finally {
      setIsApproving(false);
    }
  }, [storedReportId, accessToken, refreshToken, navigate]);

  // Resubmit after changes requested
  const handleResubmit = useCallback(async () => {
    setIsResubmitting(true);
    try {
      await api.ResubmitClinicalReport({
        clinicalReportId: storedReportId,
        accessToken,
        refreshToken,
      });
      showToast("Document resubmitted for signature!", "success");
      navigate(-1);
    } catch {
      showToast("Failed to resubmit document", "error");
    } finally {
      setIsResubmitting(false);
    }
  }, [storedReportId, accessToken, refreshToken, navigate]);

  const handleBackClick = useCallback(() => {
    if (activeSections.length > 0 && canEditInputs) {
      setUnsavedModalOpen(true);
    } else {
      navigate(-1);
    }
  }, [activeSections, canEditInputs, navigate]);

  const confirmLeave = useCallback(() => {
    setUnsavedModalOpen(false);
    navigate(-1);
  }, [navigate]);

  const cancelLeave = useCallback(() => setUnsavedModalOpen(false), []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (actionMenuOpen) dispatch(setActionMenuOpen(null));
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [actionMenuOpen, dispatch]);

  const renderAlertForChanges = () => {
    if (!showViewChangeRequest) return null;

    return (
      <Alert
        message={
          metadata?.changeRequestMessage ||
          "A change request is active for this document."
        }
        variant="info"
        primaryAction={{
          label: "View Change Request",
          onClick: handleViewChangeRequest,
        }}
      />
    );
  };

  const renderFooterButtons = () => {
    if (mode === "submittedForApproval") {
      return (
        <>
          {/* Only approver can request change */}
          <Button
            variant="secondary"
            label="Request Change"
            onClick={handleRequestChange}
            disabled={isSaving || isPublishing}
          />
          {hasPermission("approve_clinical_report") && (
            <Button
              variant="primary"
              label="Approve"
              onClick={handleApprove}
              disabled={isSaving || isPublishing || isApproving}
              loading={isApproving}
            />
          )}
        </>
      );
    }

    if (mode === "changeRequested") {
      return (
        <>
          {/* Creator can only view request */}
          {showViewChangeRequest && (
            <Button
              variant="secondary"
              label="View Change Request"
              onClick={handleViewChangeRequest}
            />
          )}
          <Button
            variant="secondary"
            label="Save as Draft"
            onClick={handleSaveDraft}
            disabled={activeSections.length === 0 || isSaving || isPublishing}
            loading={isSaving}
          />
          <Button
            variant="primary"
            label="Submit for Signature"
            onClick={handleResubmit}
            disabled={activeSections.length === 0 || isSaving || isResubmitting}
            loading={isResubmitting}
          />
        </>
      );
    }

    if (mode === "draft" && showViewChangeRequest) {
      return (
        <>
          {/* Creator sees previous request but cannot submit new one */}
          <Button
            variant="secondary"
            label="View Change Request"
            onClick={handleViewChangeRequest}
          />
          <Button
            variant="secondary"
            label="Save Draft"
            onClick={handleSaveDraft}
            disabled={activeSections.length === 0 || isSaving || isPublishing}
            loading={isSaving}
          />
          <Button
            variant="primary"
            label="Publish for Approval"
            onClick={handlePublish}
            disabled={activeSections.length === 0 || isSaving || isPublishing}
            loading={isPublishing}
          />
        </>
      );
    }

    if (mode === "clientSigned" && !isEditingAfterSigned) {
      return (
        <Button
          variant="primary"
          label="Edit Document (New Version)"
          loading={isRevertingToDraft}
          disabled={isRevertingToDraft}
          onClick={async () => {
            setIsRevertingToDraft(true);
            try {
              await api.UpdateClinicalReportStatus({
                reportId: storedReportId,
                status: "DRAFT",
                accessToken,
                refreshToken,
              });
              setIsEditingAfterSigned(true);
              showToast("Document reverted to draft for editing", "success");
            } catch (err) {
              console.error("Failed to revert to draft:", err);
              showToast("Failed to revert document to draft", "error");
            } finally {
              setIsRevertingToDraft(false);
            }
          }}
        />
      );
    }

    if (mode === "clientSigned" && isEditingAfterSigned) {
      return (
        <>
          <Button
            variant="secondary"
            label="Save as Draft"
            onClick={handleSaveDraft}
            disabled={activeSections.length === 0 || isSaving || isPublishing}
            loading={isSaving}
          />
          <Button
            variant="primary"
            label="Publish for Approval"
            onClick={handlePublish}
            disabled={activeSections.length === 0 || isSaving || isPublishing}
            loading={isPublishing}
          />
        </>
      );
    }

    if (mode === "awaitingSignature") return null;

    // Default (new or edit without change request)
    return (
      <>
        <Button
          variant="secondary"
          label="Save Draft"
          onClick={handleSaveDraft}
          disabled={activeSections.length === 0 || isSaving || isPublishing}
          loading={isSaving}
        />
        <Button
          variant="primary"
          label="Publish for Approval"
          onClick={handlePublish}
          disabled={activeSections.length === 0 || isSaving || isPublishing}
          loading={isPublishing}
        />
      </>
    );
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="crb-container">
          <div className="crb-header">
            <button className="crb-back-btn" onClick={handleBackClick}>
              <FaChevronLeft size={18} /> Back
            </button>
            <h1 className="crb-header-title">Clinical Report Builder</h1>
          </div>

          {metadata && (
            <div className="crb-metadata">
              <h2 className="crb-metadata-title">Metadata</h2>
              <div className="crb-metadata-content">
                <div className="crb-client-info">
                  <div className="crb-client-avatar">
                    {clientData?.client?.firstName?.[0] || "?"}
                    {clientData?.client?.lastName?.[0] || "?"}
                  </div>
                  <div className="crb-client-name">
                    Client{" "}
                    <strong>
                      {clientData?.client?.firstName || ""}{" "}
                      {clientData?.client?.lastName || "Not specified"}
                    </strong>
                  </div>
                </div>

                <div className="crb-metadata-grid">
                  <div className="crb-metadata-field">
                    <span className="crb-metadata-label">Document Title</span>
                    <span className="crb-metadata-value">
                      {metadata.documentTitle || "Behaviour Intervention Plan"}
                    </span>
                  </div>
                  <div className="crb-metadata-field">
                    <span className="crb-metadata-label">Date Created</span>
                    <span className="crb-metadata-value">
                      {metadata.dateCreated ||
                        formatDate(new Date(), dateFormat)}
                    </span>
                  </div>
                  <div className="crb-metadata-field">
                    <span className="crb-metadata-label">
                      Approver/Supervisor
                    </span>
                    <span className="crb-metadata-value">
                      {metadata.approver || "Not specified"}
                    </span>
                  </div>
                  <div className="crb-metadata-field">
                    <span className="crb-metadata-label">Created by</span>
                    <span className="crb-metadata-value">
                      {metadata.createdBy || "Not specified"}
                    </span>
                  </div>
                  <div className="crb-metadata-field">
                    <span className="crb-metadata-label">Last updated</span>
                    <span className="crb-metadata-value">
                      {metadata.lastUpdated || "Not saved yet"}
                    </span>
                  </div>
                  <div className="crb-metadata-field">
                    <span className="crb-metadata-label">Status</span>
                    <span
                      className={`crb-status-badge ${(metadata.status || "draft").toLowerCase()}`}
                    >
                      {metadata.status || "Draft"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="crb-metadata-footer">
                <span
                  className="crb-version-link"
                  onClick={() => navigate("/clinical-report/audit-trails", { state: { reportId: storedReportId } })}
                >
                  Document Version: {metadata.version || "v1"}
                  <div className="crb-metadata-footer-divider"></div>
                  See document trail <FaExternalLinkAlt size={14} />
                </span>
              </div>
            </div>
          )}

          {renderAlertForChanges()}

          <div className="crb-main">
            <div className="crb-sidebar">
              <h3 className="crb-sidebar-title">Document Sections</h3>
              <div className="crb-section-list">
                {SECTIONS_CONFIG.map((section) => (
                  <div
                    key={section.id}
                    className={`crb-section-item ${activeSections.includes(section.id) ? "active" : ""} ${!canAddSections ? "disabled" : ""}`}
                    onClick={() => handleAddSection(section.id)}
                    style={{
                      cursor: canAddSections ? "pointer" : "not-allowed",
                      opacity: canAddSections ? 1 : 0.5,
                    }}
                  >
                    <span className="crb-section-icon">
                      <GrDrag />
                    </span>
                    <span>{section.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="crb-preview">
              <h3 className="crb-preview-title">Document Preview</h3>

              {isLoading ? (
                <LoadingSpinner />
              ) : isSaving ? (
                <div className="crb-empty-state">
                  <h3>Saving draft...</h3>
                  <p>Your changes are being saved. Please wait.</p>
                </div>
              ) : isPublishing ? (
                <div className="crb-empty-state">
                  <h3>Publishing report...</h3>
                  <p>
                    Your report is being submitted for approval. Please wait.
                  </p>
                </div>
              ) : activeSections.length === 0 ? (
                <div className="crb-empty-state">
                  <h3>No sections added yet</h3>
                  <p>
                    {canAddSections
                      ? "Click on sections from the left to add them"
                      : "This document has no sections"}
                  </p>
                </div>
              ) : (
                <div className="crb-sections-container">
                  <SortableContext
                    items={activeSections}
                    strategy={verticalListSortingStrategy}
                  >
                    {sectionsWithData.map((swd) => (
                      <SortableSectionCard
                        key={swd.id}
                        sectionId={swd.id}
                        section={swd}
                        isExpanded={swd.isExpanded}
                        sectionData={swd.data}
                        actionMenuOpen={actionMenuOpen}
                        onToggleExpand={handleToggleExpand}
                        onActionMenu={handleActionMenu}
                        onSectionAction={handleSectionAction}
                        onDataChange={handleSectionDataChange}
                        canEditInputs={canEditInputs}
                        canAddSections={canAddSections}
                        clientData={clientData}
                      />
                    ))}
                  </SortableContext>
                </div>
              )}
            </div>
          </div>

          <div className="crb-footer">
            <div className="crb-footer-actions">{renderFooterButtons()}</div>
            {error && (
              <div className="crb-error-message">
                <span className="crb-error-icon">⚠️</span> Something went wrong. Please try again.
              </div>
            )}
          </div>

          <DragOverlay>
            {activeDragId && (
              <div className="crb-drag-overlay">
                <div className="crb-drag-overlay-content">
                  <GrDrag size={20} />
                  <h3 className="crb-drag-overlay-title">
                    {SECTIONS_CONFIG.find(
                      (s) => s.id === activeDragId.split("_")[0],
                    )?.label || "Section"}
                  </h3>
                </div>
              </div>
            )}
          </DragOverlay>

          {/* Remove Section Modal */}
          <RemoveSectionConfirmModal
            isOpen={removeModalOpen}
            sectionLabel={sectionToRemove?.label || ""}
            onConfirm={confirmRemove}
            onCancel={cancelRemove}
          />

          {/* Unsaved Changes Modal */}
          <UnsavedChangesModal
            isOpen={unsavedModalOpen}
            onConfirmLeave={confirmLeave}
            onCancel={cancelLeave}
          />

          {/* Request Change Modal – ONLY for approver in submittedForApproval */}
          {canRequestChange && (
            <ReusableModal
              isOpen={isChangeRequestModalOpen}
              onClose={() => setIsChangeRequestModalOpen(false)}
              title="Request Change"
              size="md"
              secondaryButtonText="Cancel"
              primaryButtonText="Submit Request"
              onSecondaryButtonClick={() => setIsChangeRequestModalOpen(false)}
              onPrimaryButtonClick={handleSaveChangeRequest}
              primaryButtonLoading={changeRequestLoading}
            >
              <div className="p-6">
                <TextareaInput
                  label="Describe your request"
                  value={changeRequestText}
                  onChange={(e) => setChangeRequestText(e.target.value)}
                  placeholder="Type something..."

                />
              </div>
            </ReusableModal>
          )}

          {/* View Change Request Modal */}
          <ReusableModal
            isOpen={isViewChangeModalOpen}
            onClose={() => setIsViewChangeModalOpen(false)}
            title="Change Request Details"
            size="md"
            primaryButtonText="Close"
            onPrimaryButtonClick={() => setIsViewChangeModalOpen(false)}
          >
            <div className="p-6">
              {changeRequestsLoading ? (
                <LoadingSpinner />
              ) : changeRequests.length > 0 ? (
                <div className="flex-col gap-16">
                  {changeRequests.map((cr, idx) => (
                    <div
                      key={cr.id || idx}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-12"
                    >
                      <p className="text-gray-700 mb-4 font-medium">
                        Requested by:{" "}
                        {cr.requester?.fullName ||
                          cr.approver?.fullName ||
                          cr.approverId ||
                          "Approver"}
                      </p>
                      {cr.approver?.fullName && cr.requester?.fullName && (
                        <p className="text-gray-600 mb-4 text-sm">
                          Approver: {cr.approver.fullName}
                        </p>
                      )}
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {cr.description || "No details provided."}
                      </p>
                      {cr.status && (
                        <p className="text-sm text-gray-500 mt-4">
                          Status:{" "}
                          <span className="font-medium">
                            {cr.status.replace(/_/g, " ")}
                          </span>
                        </p>
                      )}
                      {cr.createdAt && (
                        <p className="text-sm text-gray-400 mt-4">
                          {formatDateTime(cr.createdAt, dateFormat, timeFormat)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No change requests found.</p>
              )}
              <p className="text-sm text-gray-500 mt-4">
                {mode === "changeRequested"
                  ? "You can now make the requested changes and resubmit."
                  : "The creator has been notified to address these changes."}
              </p>
            </div>
          </ReusableModal>
        </div>
      </DndContext>
    </>
  );
};

export default React.memo(ClinicalReportBuilder);
