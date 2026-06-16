import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { FaArrowLeft, FaPlus, FaSave } from "react-icons/fa";
import { AiOutlineDelete } from "react-icons/ai";
import { SwitchInput, TextareaInput, TextInput } from "../Input/Inputs";
import ColorPicker from "../ColorPicker";

import Button from "../Button/Button";
import CustomDocumentModal from "../ReusableModal/CustomDocumentModal";
import CustomTaskModal from "../ReusableModal/CustomTaskModal";
import MoveCandidateModal from "../ReusableModal/MoveCandidateModal";
import AssignCandidateModal from "../ReusableModal/AssignCandidateModal";
import AddProspectModal from "../ReusableModal/AddProspectModal";
import DeleteConfirmationModal from "../ReusableModal/DeleteConfirmationModal";
import "./ManageColumn.css";
import {
  updateDraft,
  addTaskToDraft,
  removeTaskFromDraft,
  toggleTaskRequiredInDraft,
  addDocumentToDraft,
  removeDocumentFromDraft,
  toggleDocumentRequiredInDraft,
  resetDraft,
  fetchSinglePipelineStages,
  updateStageTasks,
  updateStageDocuments,
  fetchPipelineItems,
  updatePipelineItemActivity,
  deletePipelineItem,
  reassignCandidateToStaff,
} from "../../ReduxStore/features/PipelineSlice";
import CustomTable from "../Table/CustomTable";
import { showToast } from "../../Helper/ShowToast";
import { formatDatePadded as formatDate } from "../../Helper/Formatters";
import LoadingSpinner from "../LoadingSpinner";
import api from "../../api/TenantApis";

const ManageColumn = () => {
  const { pipelineStageId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pipeline, draft, status, error } = useSelector((state) => state.pipeline);
  const { accessToken, refreshToken } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState("basic");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [tableDataState, setTableDataState] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [stages, setStages] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const authTokens = useMemo(
    () => ({
      accessToken,
      refreshToken,
    }),
    [accessToken, refreshToken]
  );

  // Fetch pipeline items
  const fetchPipelineItemsData = useCallback(() => {
    dispatch(fetchPipelineItems({ stageId: pipelineStageId, ...authTokens }))
      .unwrap()
      .then((response) => {
        const mappedData = response.items.map((item) => ({
          id: item.id,
          columnId: pipelineStageId,
          name: item.companyName || "Unknown Company",
          date_created: formatDate(item.createdAt),
          added_by: item.createdBy || "Unknown Admin",
          assigned_to: item.assignedTo || "Unassigned",
          assigned_to_id: item.assignToAdmin || null,
          stage_completion: Math.round((item.completionPercentage || 0) / 10) * 10,
          hasActions: true,
          hasCheckbox: true,
        }));
        setTableDataState(mappedData);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error("Failed to fetch pipeline items:", err);
        setTableDataState([]);
      });
  }, [dispatch, pipelineStageId, authTokens]);

  // Fetch staff and stages data
  const fetchStaffAndStages = useCallback(async () => {
    try {
      const [adminsResponse, stagesResponse] = await Promise.all([
        api.getAllAdmins(authTokens),
        pipeline?.id
          ? api.GetPipelineStage({
              pipelineId: pipeline.id,
              ...authTokens,
            })
          : Promise.resolve({ data: { data: [] } }),
      ]);

      setStaffList(
        adminsResponse.data?.data?.map((admin) => ({
          staffId: admin.id,
          name: `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Unknown Admin",
        })) || []
      );

      setStages(
        stagesResponse.data?.data?.map((stage) => ({
          stageId: stage.id,
          name: stage.name || "Unnamed Stage",
        })) || []
      );
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to fetch staff or stages:", err);
    }
  }, [authTokens, pipeline?.id]);

  // Fetch pipeline stage data
  useEffect(() => {
    if (pipelineStageId) {
      dispatch(
        fetchSinglePipelineStages({
          pipelineStageId,
          ...authTokens,
        })
      )
        .unwrap()
        .then((response) => {
          const stageData = response.data;
          if (stageData) {
            dispatch(
              updateDraft({
                id: stageData.id,
                name: stageData.name || "",
                description: stageData.description || "",
                colorCode: stageData.colourCode || "#1E40AF",
                requiredTasks: Array.isArray(stageData.requiredTasks)
                  ? stageData.requiredTasks
                  : [],
                requiredDocuments: Array.isArray(stageData.requiredDocuments)
                  ? stageData.requiredDocuments
                  : [],
              })
            );
          }
        })
        .catch((err) => {
          if (import.meta.env.DEV) console.error("Failed to fetch stage data:", err);
        });

      fetchPipelineItemsData();
      fetchStaffAndStages();
    }

    return () => dispatch(resetDraft());
  }, [pipelineStageId, dispatch, authTokens, fetchStaffAndStages, fetchPipelineItemsData]);

  // Handle candidate addition
  const handleAddCandidate = useCallback(
    (candidateData) => {
      fetchPipelineItemsData();
      setShowAddProspectModal(false);
    },
    [fetchPipelineItemsData]
  );

  // Save basic info (name, description, color)
  const handleSaveBasicInfo = async () => {
    if (!pipelineStageId) return;

    setIsSaving(true);
    try {
      await api.UpdatePipelineStage({
        id: pipelineStageId,
        name: draft.name,
        description: draft.description,
        colourCode: draft.colorCode,
        ...authTokens,
      });

      showToast("Stage information updated successfully!", "success");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to update stage:", err);
      showToast(
        err.response?.data?.message || "Failed to update stage information",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Generalized save function for tasks and documents
  const handleSaveItems = async (type, items, action) => {
    if (!pipelineStageId) return;

    setIsSaving(true);
    try {
      await dispatch(
        action({
          pipelineStageId,
          [type]: items,
          ...authTokens,
        })
      ).unwrap();
      showToast(
        `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`,
        "success"
      );
    } catch (err) {
      if (import.meta.env.DEV) console.error(`Failed to update ${type}:`, err);
      showToast(
        err.response?.data?.message || `Failed to update ${type}`,
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Reassign candidates to staff
  const handleAssignSave = async (staffId) => {
    const candidateIds = selectedCandidate
      ? [selectedCandidate.id]
      : selectedCandidates;

    if (!candidateIds.length) return;

    setIsSaving(true);
    try {
      const response = await dispatch(
        reassignCandidateToStaff({
          ids: candidateIds,
          assignToAdmin: staffId,
          ...authTokens,
        })
      ).unwrap();

      if (response.data.status === "ok") {
        fetchPipelineItemsData();
        showToast(
          `Assigned ${candidateIds.length} candidate(s) successfully!`,
          "success"
        );
      } else {
        throw new Error("Failed to assign staff.");
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Staff assignment failed:", err);
      showToast(
        err.response?.data?.message || "Failed to assign candidate(s).",
        "error"
      );
    } finally {
      setIsSaving(false);
      setShowAssignModal(false);
      setSelectedCandidate(null);
      setSelectedCandidates([]);
    }
  };

  // Move candidates to another stage
  const handleMoveSave = async (targetStageId) => {
    const stageName =
      stages.find((s) => s.stageId === targetStageId)?.name || "Unknown Stage";
    const candidateIds = selectedCandidate
      ? [selectedCandidate.id]
      : selectedCandidates;

    if (!candidateIds.length) return;

    setIsSaving(true);
    try {
      const response = await dispatch(
        updatePipelineItemActivity({
          ids: candidateIds,
          pipelineStageId: targetStageId,
          ...authTokens,
        })
      ).unwrap();

      if (response.data.status === "ok") {
        fetchPipelineItemsData();
        showToast(
          `Moved ${candidateIds.length} candidate(s) to ${stageName}`,
          "success"
        );
      } else {
        throw new Error("Failed to move candidates.");
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Candidate move failed:", err);
      showToast(
        err.response?.data?.message || "Failed to move candidate(s).",
        "error"
      );
    } finally {
      setIsSaving(false);
      setShowMoveModal(false);
      setSelectedCandidate(null);
      setSelectedCandidates([]);
    }
  };

  // Delete candidates (single or bulk)
  const handleDeleteTask = async () => {
    const selectedIds = selectedCandidate
      ? [selectedCandidate.id]
      : selectedCandidates;

    if (!selectedIds.length) return;

    setIsSaving(true);
    try {
      const response = await dispatch(
        deletePipelineItem({
          ids: selectedIds,
          ...authTokens,
        })
      ).unwrap();

      if (response.status === "ok") {
        fetchPipelineItemsData();
        showToast(
          `Deleted ${selectedIds.length} candidate(s) successfully!`,
          "success"
        );
      } else {
        throw new Error("Failed to delete candidates.");
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Candidate deletion failed:", err);
      showToast(
        err.response?.data?.message || "Failed to delete candidate(s).",
        "error"
      );
    } finally {
      setIsSaving(false);
      setShowDeleteCandidateModal(false);
      setSelectedCandidate(null);
      setSelectedCandidates([]);
    }
  };

  const handleFilterChange = (key, value) => {
  };

  const filters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        { value: "date_created", label: "Date Created" },
        { value: "assign_to", label: "Assign To" },
        { value: "stage_completion", label: "Stage Completion" },
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ];

  // Map stages to columns format for MoveCandidateModal
  const columnsForModal = stages.map((stage) => ({
    id: stage.stageId,
    title: stage.name,
  }));

  // Map tableDataState to tasks format for AssignCandidateModal
  const tasksForModal = tableDataState.reduce((acc, item) => ({
    ...acc,
    [item.id]: {
      id: item.id,
      company: item.name,
      staff: item.assigned_to_id,
    },
  }), {});

  return (
    <div className="manage-column-container">
        {/* Header */}
        <div className="manage-column-header" onClick={() => navigate(-1)} role="button" tabIndex={0} aria-label="Go back">
          <button className="back-button">
            <FaArrowLeft />
            Back
          </button>
          <h1>{draft.name || "Pipeline Stage"}</h1>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "basic" ? "active" : ""}`}
            onClick={() => setActiveTab("basic")}
          >
            Basic setup
          </button>
          <button
            className={`tab ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            Tasks & Requirements
          </button>
          <button
            className={`tab ${activeTab === "candidates" ? "active" : ""}`}
            onClick={() => setActiveTab("candidates")}
          >
            Candidates
            <span className="candidate-count">{tableDataState.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "basic" && (
            <div className="basic-setup">
              <TextInput
                label="Column name"
                value={draft.name}
                onChange={(e) =>
                  dispatch(updateDraft({ name: e.target.value }))
                }
                placeholder="Enter column name"
              />
              <TextareaInput
                label="Description"
                value={draft.description}
                onChange={(e) =>
                  dispatch(updateDraft({ description: e.target.value }))
                }
                placeholder="Enter description"
              />
              <div className="color-picker-container">
                <div
                  className="color-picker-row flex items-center"
                  style={{ marginTop: "20px" }}
                >
                  <label style={{ marginRight: "10px" }}>Colour code</label>
                  <div
                    className="color-preview inline-block rounded-full"
                    style={{
                      backgroundColor: draft.colorCode || "#000000",
                      width: "24px",
                      height: "24px",
                    }}
                  />
                  <button
                    className="change-button ml-auto border-0 cursor-pointer"
                    onClick={() => setShowColorPicker(true)}
                    style={{
                      color: "#0000EE",
                      background: "none",
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
              {showColorPicker && (
                <ColorPicker
                  color={draft.colorCode}
                  onChange={(color) => {
                    dispatch(updateDraft({ colorCode: color }));
                    setShowColorPicker(false);
                  }}
                  onClose={() => setShowColorPicker(false)}
                />
              )}

              <div
                className="flex justify-between"
                style={{ gap: "10px" }}
              >


                <Button
                  variant="secondary-danger"
                  width="200px"
                  label="Delete this Column"
                  onClick={() => {
                    if (window.confirm("Delete this stage?")) {
                      navigate(-1);
                      showToast("Stage deleted", "success");
                    }
                  }}
                />
                <div className="save-button-container">
                  <Button
                    label="Save Changes"
                    icon={<FaSave />}
                    onClick={handleSaveBasicInfo}
                    loading={isSaving}
                    width="auto"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="tasks-requirements">
              {/* Tasks Section */}
              <div className="tasks-section">
                <div
                  className="tasks-header flex justify-between mb-4"
                >
                  <span className="tasks-title">Tasks</span>
                  <span className="required-title">Required</span>
                </div>
                <div className="tasks-list">
                  {draft.requiredTasks.length > 0 ? (
                    draft.requiredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="task-item flex justify-between items-center mb-4"
                      >
                        <div
                          className="task-name-container flex items-center"
                        >
                          <span>{task.name}</span>
                          <button
                            className="delete-btn ml-2 border-0 cursor-pointer p-0"
                            onClick={() =>
                              dispatch(removeTaskFromDraft(task.id))
                            }
                            style={{ background: "none" }}
                          >
                            <AiOutlineDelete color="red" size={20} />
                          </button>
                        </div>
                        <div className="toggle-switch-container">
                          <SwitchInput
                            checked={task.required}
                            onChange={() =>
                              dispatch(toggleTaskRequiredInDraft(task.id))
                            }
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className="no-items-message text-center"
                      style={{ margin: "20px 0" }}
                    >
                      No tasks added yet
                    </div>
                  )}
                </div>
                <div
                  className="flex justify-between"
                  style={{ gap: "10px" }}
                >

                  <div className="add-button-container">
                    <Button
                      label="Add a new task"
                      variant="outline"
                      iconPosition="left"
                      onClick={() => setShowTaskModal(true)}
                      width="auto"
                    />
                  </div>
                  <div className="save-button-container">
                    <Button
                      label="Save Tasks"
                      icon={<FaSave />}
                      loading={isSaving}
                      onClick={() =>
                        handleSaveItems(
                          "requiredTasks",
                          draft.requiredTasks,
                          updateStageTasks
                        )
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="documents-section">
                <div
                  className="documents-header flex justify-between mb-4"
                >
                  <span className="documents-title">Documents</span>
                  <span className="required-title">Required</span>
                </div>
                <div className="documents-lists">
                  {draft.requiredDocuments.length > 0 ? (
                    draft.requiredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="document-items flex justify-between items-center mb-4"
                      >
                        <div
                          className="document-name-container flex items-center"
                        >
                          <span>{doc.name}</span>
                          <button
                            className="delete-btn ml-2 border-0 cursor-pointer p-0"
                            onClick={() =>
                              dispatch(removeDocumentFromDraft(doc.id))
                            }
                            style={{ background: "none" }}
                          >
                            <AiOutlineDelete color="red" size={20} />
                          </button>
                        </div>
                        <div className="toggle-switch-container">
                          <SwitchInput
                            checked={doc.required}
                            onChange={() =>
                              dispatch(toggleDocumentRequiredInDraft(doc.id))
                            }
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className="no-items-message text-center"
                      style={{ margin: "20px 0" }}
                    >
                      No documents added yet
                    </div>
                  )}
                </div>

                <div
                  className="flex justify-between"
                  style={{ gap: "10px" }}
                >

                  <div className="add-button-container">
                    <Button
                      label="Request a new document"
                      variant="outline"
                      iconPosition="left"
                      onClick={() => setShowDocumentModal(true)}
                      width="auto"
                    />
                  </div>
                  <div className="save-button-container">
                    <Button
                      label="Save Documents"
                      icon={<FaSave />}
                      loading={isSaving}
                      onClick={() =>
                        handleSaveItems(
                          "requiredDocuments",
                          draft.requiredDocuments,
                          updateStageDocuments
                        )
                      }
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              {/* Modals */}
              <CustomDocumentModal
                isOpen={showDocumentModal}
                onClose={() => setShowDocumentModal(false)}
                onSave={(docData) => {
                  const newDoc = {
                    id: `document-${Date.now()}`,
                    name: docData.name,
                    required: true,
                  };
                  dispatch(addDocumentToDraft(newDoc));
                  setShowDocumentModal(false);
                }}
              />

              <CustomTaskModal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                onSave={(taskData) => {
                  const newTask = {
                    id: `task-${Date.now()}`,
                    name: taskData.name,
                    required: true,
                  };
                  dispatch(addTaskToDraft(newTask));
                  setShowTaskModal(false);
                }}
              />
            </div>
          )}

          {activeTab === "candidates" && (
            <div className="candidates-tab">
              <div className="add-candidate-manage">
                <Button
                  label="Add new candidate"
                  icon={<FaPlus />}
                  iconPosition="left"
                  variant="primary"
                  width="auto"
                  onClick={() => setShowAddProspectModal(true)}
                />
              </div>
              <div className="candidates-content">
                <CustomTable
                  data={tableDataState}
                  columns={columns}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  actions={actions.map((action) => ({
                    ...action,
                    onClick: (candidate) =>
                      action.onClick(candidate, {
                        setSelectedCandidate,
                        setSelectedCandidates,
                        setShowMoveModal,
                        setShowAssignModal,
                        setShowDeleteCandidateModal,
                        navigate,
                      }),
                  }))}
                  showActions={true}
                  itemsPerPage={15}
                  tableName="ManageColumn"
                  onAssignToStaff={(selectedIds) => {
                    setSelectedCandidates(selectedIds);
                    setShowAssignModal(true);
                  }}
                  onMoveCandidates={(selectedIds) => {
                    setSelectedCandidates(selectedIds);
                    setShowMoveModal(true);
                  }}
                  onDelete={(selectedIds) => {
                    setSelectedCandidates(selectedIds);
                    setShowDeleteCandidateModal(true);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <AddProspectModal
          isOpen={showAddProspectModal}
          onClose={() => setShowAddProspectModal(false)}
          onSave={handleAddCandidate}
          staffList={staffList}
          stages={stages}
          pipelineStageId={pipelineStageId}
        />

        <AssignCandidateModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedCandidate(null);
            setSelectedCandidates([]);
          }}
          onSave={handleAssignSave}
          staffList={staffList}
          taskIds={selectedCandidate ? [selectedCandidate.id] : selectedCandidates}
          tasks={tasksForModal}
        />

        <MoveCandidateModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedCandidate(null);
            setSelectedCandidates([]);
          }}
          onSave={handleMoveSave}
          currentColumnId={pipelineStageId}
          columns={columnsForModal}
          taskIds={selectedCandidate ? [selectedCandidate.id] : selectedCandidates}
          dispatch={dispatch}
        />

        <DeleteConfirmationModal
          isOpen={showDeleteCandidateModal}
          onClose={() => {
            setShowDeleteCandidateModal(false);
            setSelectedCandidate(null);
            setSelectedCandidates([]);
          }}
          onConfirm={handleDeleteTask}
          title={`Are you sure you want to delete ${selectedCandidates.length} candidate(s)?`}
          message="All information and files related to the selected candidate(s) will be deleted forever. This action cannot be undone."
          confirmButtonText="Delete"
          confirmButtonColor="#D92D20"
        />

        {status === "loading" || isSaving ? <LoadingSpinner /> : null}
      </div>
  );
};

// Table configuration (moved outside the component to avoid redefinition)
const columns = [
  { key: "name", header: "Name" },
  { key: "date_created", header: "Date Created" },
  { key: "added_by", header: "Added by" },
  { key: "assigned_to", header: "Assigned to" },
  {
    key: "stage_completion",
    header: "Stage completion",
    type: "stage_completion",
  },
];

const actions = [
  {
    label: "Move candidate",
    onClick: (candidate, { setSelectedCandidate, setSelectedCandidates, setShowMoveModal }) => {
      setSelectedCandidate(candidate);
      setSelectedCandidates([candidate.id]);
      setShowMoveModal(true);
    },
  },
  {
    label: "Reassign to staff",
    onClick: (candidate, { setSelectedCandidate, setSelectedCandidates, setShowAssignModal }) => {
      setSelectedCandidate(candidate);
      setSelectedCandidates([candidate.id]);
      setShowAssignModal(true);
    },
  },
  {
    label: "View candidate",
    onClick: (candidate, { navigate }) => {
      navigate(`/tenants/candidate-single/${candidate.columnId}/${candidate.id}`);
    },
  },
  {
    label: "Edit candidate",
    onClick: (candidate, { navigate }) => {
      navigate(`/tenants/candidate-single/${candidate.columnId}/${candidate.id}/edit`);
    },
  },
  {
    label: "Remove candidate",
    className: "remove",
    onClick: (candidate, { setSelectedCandidate, setSelectedCandidates, setShowDeleteCandidateModal }) => {
      setSelectedCandidate(candidate);
      setSelectedCandidates([candidate.id]);
      setShowDeleteCandidateModal(true);
    },
  },
];

export default ManageColumn;