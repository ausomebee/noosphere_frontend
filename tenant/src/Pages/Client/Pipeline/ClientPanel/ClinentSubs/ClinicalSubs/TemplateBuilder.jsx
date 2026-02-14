// ClinicalReportTemplateBuilder.jsx
import React, { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { GrDrag } from "react-icons/gr";
import { useNavigate, useLocation } from "react-router-dom";
import { FaChevronLeft, FaEllipsisV } from "react-icons/fa";
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
import DashboardLayout from "../../../../../../Layout/TenantLayout";
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
import { TextInput } from "../../../../../../Components/Input/Inputs";
import api from "../../../../../../api/TemplateAndReportApi";
import {
  initializeTemplate,
  addSection,
  removeSection,
  toggleSectionExpand,
  updateSectionData,
  reorderSections,
  setActionMenuOpen,
  setActiveDragId,
  updateTemplateTitle,
  saveTemplate,
  loadTemplate,
  selectTemplateMetadata,
  selectActiveSections,
  selectExpandedSections,
  selectSectionData,
  selectActionMenuOpen,
  selectActiveDragId,
  selectIsSaving,
  selectSaveSuccess,
  selectError,
  selectActiveSectionsWithData,
  selectTemplateMode,
  selectTemplateId,
  SECTIONS_CONFIG,
  resetSaveStates, // ← added here
} from "../../../../../../ReduxStore/features/clinicalReportTemplateSlice";

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
          backgroundColor: "#ffffff",
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
          ?
          <br />
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
              color: "#ffffff",
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

// Unsaved Changes Modal (for back navigation)
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
          backgroundColor: "#ffffff",
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
          You have unsaved changes in this template. Leaving now will discard
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
              color: "#ffffff",
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
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: sectionId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const sectionType = sectionId.split("_")[0];
    const SectionComponent = SECTION_COMPONENTS[sectionType];

    return (
      <div ref={setNodeRef} style={style} className="crb-section-card">
        <div
          className="crb-section-header"
          onClick={() => onToggleExpand(sectionId)}
        >
          <div className="crb-section-header-left">
            <button
              className="crb-drag-handle"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GrDrag />
            </button>
            <h3 className="crb-section-title">{section.label}</h3>
          </div>
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
        </div>

        <div
          className={`crb-section-content ${!isExpanded ? "collapsed" : ""}`}
        >
          {SectionComponent && (
            <SectionComponent
              data={sectionData || {}}
              onChange={(data) =>
                canEditInputs && onDataChange(sectionId, data)
              }
              isReadOnly={!canEditInputs}
            />
          )}
        </div>
      </div>
    );
  },
);
SortableSectionCard.displayName = "SortableSectionCard";

const ClinicalReportTemplateBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

  const {
    id: templateId,
    initialTitle,
    sections: initialSections,
    mode = "newTemplate",
  } = location.state || {};

  const templateMetadata = useSelector(selectTemplateMetadata);
  const activeSections = useSelector(selectActiveSections);
  const expandedSections = useSelector(selectExpandedSections);
  const sectionData = useSelector(selectSectionData);
  const actionMenuOpen = useSelector(selectActionMenuOpen);
  const activeDragId = useSelector(selectActiveDragId);
  const isSaving = useSelector(selectIsSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const error = useSelector(selectError);
  const isLoading = useSelector(
    (state) => state.clinicalReportTemplate?.isLoading || false,
  );
  const sectionsWithData = useSelector(selectActiveSectionsWithData);
  const templateMode = useSelector(selectTemplateMode);
  const storedTemplateId = useSelector(selectTemplateId);

  const [templateTitle, setTemplateTitle] = useState("");
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [sectionToRemove, setSectionToRemove] = useState(null);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);

  const canEditInputs = mode !== "viewTemplate";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Initialize template
  useEffect(() => {
    if (mode === "newTemplate") {
      dispatch(
        initializeTemplate({
          id: templateId,
          title: initialTitle || "",
          sections: initialSections,
          mode,
          tenantId,
        }),
      );
    } else if (
      (mode === "editTemplate" || mode === "viewTemplate") &&
      templateId
    ) {
      dispatch(
        loadTemplate({
          templateId,
          api,
          tokens: { accessToken, refreshToken },
        }),
      );
    } else if (initialSections) {
      dispatch(
        initializeTemplate({
          id: templateId,
          title: initialTitle || "",
          sections: initialSections,
          mode,
          tenantId,
        }),
      );
    }
  }, [
    dispatch,
    mode,
    templateId,
    initialTitle,
    initialSections,
    tenantId,
    accessToken,
    refreshToken,
  ]);

  // Set title
  useEffect(() => {
    if (mode === "newTemplate" && initialTitle) {
      const cleaned = initialTitle.trim();
      if (cleaned && cleaned !== templateTitle) {
        setTemplateTitle(cleaned);
        dispatch(updateTemplateTitle(cleaned));
      }
      return;
    }
    if (templateMetadata.title && templateMetadata.title !== templateTitle) {
      setTemplateTitle(templateMetadata.title);
    }
  }, [mode, initialTitle, templateMetadata.title, dispatch, templateTitle]);

  // Auto-navigate back on successful save
  useEffect(() => {
    if (saveSuccess) {
      showToast("Template saved successfully!");
      navigate(-1);
      dispatch(resetSaveStates()); // Reset save state
    }
  }, [saveSuccess, navigate, dispatch]);

  useEffect(() => {
    if (error) showToast(`Error: ${error}`, "error");
  }, [error]);

  const handleAddSection = useCallback(
    (sectionId) => {
      if (!canEditInputs) return;
      const baseType = sectionId;
      if (activeSections.some((id) => id.split("_")[0] === baseType)) {
        showToast("This section is already added to the template", "info");
        return;
      }
      dispatch(addSection(sectionId));
    },
    [dispatch, canEditInputs, activeSections],
  );

  const handleToggleExpand = useCallback(
    (sectionId) => dispatch(toggleSectionExpand(sectionId)),
    [dispatch],
  );

  const handleSectionDataChange = useCallback(
    (sectionId, data) => {
      if (canEditInputs) dispatch(updateSectionData({ sectionId, data }));
    },
    [dispatch, canEditInputs],
  );

  const handleSectionAction = useCallback(
    (sectionId, action) => {
      if (!canEditInputs) return;
      dispatch(setActionMenuOpen(null));

      switch (action) {
        case "minimize":
        case "expand":
          dispatch(toggleSectionExpand(sectionId));
          break;
        case "remove":
          const baseId = sectionId.split("_")[0];
          const label =
            SECTIONS_CONFIG.find((s) => s.id === baseId)?.label ||
            "this section";
          setSectionToRemove({ id: sectionId, label });
          setRemoveModalOpen(true);
          break;
        default:
          break;
      }
    },
    [dispatch, canEditInputs],
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
    (event) => {
      if (canEditInputs) dispatch(setActiveDragId(event.active.id));
    },
    [dispatch, canEditInputs],
  );

  const handleDragEnd = useCallback(
    (event) => {
      if (!canEditInputs) return;
      const { active, over } = event;
      if (active.id !== over?.id) {
        dispatch(reorderSections({ activeId: active.id, overId: over.id }));
      } else {
        dispatch(setActiveDragId(null));
      }
    },
    [dispatch, canEditInputs],
  );

  const handleDragCancel = useCallback(
    () => dispatch(setActiveDragId(null)),
    [dispatch],
  );

  const handleSaveTemplate = useCallback(() => {
    const templateData = {
      templateId: storedTemplateId,
      templateMetadata: { ...templateMetadata, title: templateTitle, tenantId },
      activeSections,
      sectionData,
    };
    dispatch(
      saveTemplate({
        templateData,
        api,
        tokens: { accessToken, refreshToken },
      }),
    );
  }, [
    storedTemplateId,
    templateMetadata,
    templateTitle,
    tenantId,
    activeSections,
    sectionData,
    accessToken,
    refreshToken,
    dispatch,
  ]);

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

  return (
    <DashboardLayout>
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
              <FaChevronLeft size={18} />
              Back
            </button>
            <h1 className="crb-header-title">
              Clinical Report Template Builder
            </h1>
          </div>

          <div className="mt-20 items-start justify-start bg-gray-50 rounded-lg p-4">
            <TextInput
              label="Template Name"
              placeholder="Enter template name"
              value={templateTitle}
              onChange={(e) => {
                setTemplateTitle(e.target.value);
                dispatch(updateTemplateTitle(e.target.value));
              }}
              disabled={!canEditInputs || mode === "newTemplate"}
              className="max-w-md"
            />
            {mode === "newTemplate" && templateTitle && (
              <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
                Name set from creation modal. You can edit it later.
              </p>
            )}
          </div>

          <div className="crb-main">
            <div className="crb-sidebar">
              <h3 className="crb-sidebar-title">Document Sections</h3>
              <div className="crb-section-list">
                {SECTIONS_CONFIG.map((section) => {
                  const isAdded = activeSections.some(
                    (id) => id.split("_")[0] === section.id,
                  );
                  return (
                    <div
                      key={section.id}
                      className={`crb-section-item ${isAdded ? "active" : ""} ${
                        !canEditInputs || isAdded ? "disabled" : ""
                      }`}
                      onClick={() => handleAddSection(section.id)}
                      style={{
                        cursor:
                          canEditInputs && !isAdded ? "pointer" : "not-allowed",
                        opacity: canEditInputs && !isAdded ? 1 : 0.6,
                      }}
                    >
                      <span className="crb-section-icon">
                        <GrDrag />
                      </span>
                      <span>{section.label}</span>
                      {isAdded && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "0.85em",
                            color: "#555",
                            fontStyle: "italic",
                          }}
                        >
                          Added
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="crb-preview">
              <h3 className="crb-preview-title">Template Preview</h3>

              {isLoading ? (
                <div className="crb-empty-state">
                  <h3>Loading template...</h3>
                  <p>Please wait while we fetch your template data</p>
                </div>
              ) : isSaving ? (
                <div className="crb-empty-state">
                  <h3>Saving template...</h3>
                  <p>Your changes are being saved. Please wait.</p>
                </div>
              ) : activeSections.length === 0 ? (
                <div className="crb-empty-state">
                  <h3>No sections added yet</h3>
                  <p>
                    {canEditInputs
                      ? "Click on sections from the left to add them to your template"
                      : "This template has no sections"}
                  </p>
                </div>
              ) : (
                <div className="crb-sections-container">
                  <SortableContext
                    items={activeSections}
                    strategy={verticalListSortingStrategy}
                  >
                    {sectionsWithData.map(({ id, label, data, isExpanded }) => (
                      <SortableSectionCard
                        key={id}
                        sectionId={id}
                        section={{ id, label }}
                        isExpanded={isExpanded}
                        sectionData={data}
                        actionMenuOpen={actionMenuOpen}
                        onToggleExpand={handleToggleExpand}
                        onActionMenu={(id) => dispatch(setActionMenuOpen(id))}
                        onSectionAction={handleSectionAction}
                        onDataChange={handleSectionDataChange}
                        canEditInputs={canEditInputs}
                      />
                    ))}
                  </SortableContext>
                </div>
              )}
            </div>
          </div>

          <div className="crb-footer">
            <div className="crb-footer-actions">
              {canEditInputs && (
                <Button
                  variant="primary"
                  label={isSaving ? "Saving..." : "Save Template"}
                  onClick={handleSaveTemplate}
                  disabled={
                    activeSections.length === 0 || isSaving || !templateTitle
                  }
                  loading={isSaving}
                />
              )}
            </div>
            {error && (
              <div className="crb-error-message">
                <span className="crb-error-icon">⚠️</span>
                {error}
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

          {/* Remove Confirmation Modal */}
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
        </div>
      </DndContext>
    </DashboardLayout>
  );
};

export default React.memo(ClinicalReportTemplateBuilder);
