import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { FaArrowLeft, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import { TextareaInput, TextInput } from "../Input/Inputs";
import ColorPicker from "../ColorPicker";
import Layout from "../../Layout/TenantLayout";
import Button from "../Button/Button";
import AddClientModal from "../ReusableModal/ClientModal/AddClientModal";
import DeleteConfirmationModal from "../ReusableModal/PipelineModal/DeleteConfirmationModal";
import "./ManageColumn.css";
import {
  updateDraft,
  resetDraft,
  fetchSinglePipelineStages,
  fetchPipelineStages,
  fetchPipelineItems,
  deletePipelineItem,
  deletePipelineStage,
  createCandidate,
} from "../../ReduxStore/features/PipelineSlice";
import CustomTable from "../Table/CustomTable";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/TenantApis";
import { FiEdit2 } from "react-icons/fi";
import { BsTrash } from "react-icons/bs";
import { formatDate } from "../../Helper/Formatters";
import useFormatSettings from "../../hooks/useFormatSettings";
import SectionLoader from "../SectionLoader";

const ManageColumn = () => {
  const { pipelineStageId } = useParams();
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [deletingStage, setDeletingStage] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pipeline, draft, status } = useSelector(
    (state) => state.pipeline,
  );
  const { tenantId, accessToken, refreshToken, userId } = useAuth();
  const { dateFormat } = useFormatSettings();

  // State management
  const [activeTab, setActiveTab] = useState("basic");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] =
    useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [tableDataState, setTableDataState] = useState([]);
  const [, setStages] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false);

  const authTokens = useMemo(
    () => ({
      accessToken,
      refreshToken,
    }),
    [accessToken, refreshToken],
  );

  // Fetch pipeline items
  const fetchPipelineItemsData = useCallback(() => {
    dispatch(fetchPipelineItems({ stageId: pipelineStageId, ...authTokens }))
      .unwrap()
      .then((response) => {
        const mappedData = response.items.map((item) => ({
          id: item.id,
          columnId: pipelineStageId,
          client:
            item.fullName ||
            `${item.firstName} ${item.lastName}`.trim() ||
            "Unknown Candidate",
          firstName: item.firstName || "",
          lastName: item.lastName || "",
          email: item.email || "",
          phoneNumber: item.phoneNumber || "",
          added_by: item.createdBy || "Unknown Admin",
          dateTime: formatDate(item.createdAt, dateFormat),
          hasActions: true,
          hasCheckbox: true,
        }));
        setTableDataState(mappedData);
      })
      .catch((err) => {
        console.error("Failed to fetch pipeline items:", err);
        setTableDataState([]);
      });
  }, [dispatch, pipelineStageId, authTokens, dateFormat]);

  // Fetch stages data
  const fetchStages = useCallback(async () => {
    try {
      const stagesResponse = await (pipeline?.id
        ? api.GetPipelineStage({
            pipelineId: pipeline.id,
            ...authTokens,
          })
        : Promise.resolve({ data: { data: [] } }));

      setStages(
        stagesResponse.data?.data?.map((stage) => ({
          stageId: stage.id,
          name: stage.name || "Unnamed Stage",
        })) || [],
      );
    } catch (err) {
      console.error("Failed to fetch stages:", err);
    }
  }, [authTokens, pipeline?.id]);

  // Fetch pipeline stage data
  useEffect(() => {
    if (pipelineStageId) {
      dispatch(
        fetchSinglePipelineStages({
          pipelineStageId,
          ...authTokens,
        }),
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
              }),
            );
          }
        })
        .catch((err) => {
          console.error("Failed to fetch stage data:", err);
        });

      fetchPipelineItemsData();
      fetchStages();
    }

    return () => dispatch(resetDraft());
  }, [
    pipelineStageId,
    dispatch,
    authTokens,
    fetchStages,
    fetchPipelineItemsData,
  ]);

  // Handle candidate addition - FIXED: Now calls the API
  const handleAddCandidate = useCallback(
    async (clientData) => {
      if (!pipelineStageId || !tenantId) {
        showToast("Pipeline stage ID or Tenant ID is not available.", "error");
        return;
      }

      setIsCreatingCandidate(true);
      try {
        const result = await dispatch(
          createCandidate({
            ...clientData,
            tenantId,
            pipelineStageId: pipelineStageId,
            createdBy: userId,
            accessToken: authTokens.accessToken,
            refreshToken: authTokens.refreshToken,
          }),
        ).unwrap();

        if (result.data) {
          showToast("Candidate added successfully!", "success");
          fetchPipelineItemsData(); // Refresh the table data
          // Modal closes itself via onClose on success.
        } else {
          throw new Error("Failed to create candidate");
        }
        // The error propagates so AddClientModal shows it and stays open.
      } finally {
        setIsCreatingCandidate(false);
      }
    },
    [dispatch, pipelineStageId, tenantId, authTokens, fetchPipelineItemsData],
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
      console.error("Failed to update stage:", err);
      showToast(
        err.response?.data?.message || "Failed to update stage information",
        "error",
      );
    } finally {
      setIsSaving(false);
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
        }),
      ).unwrap();

      if (response.status === "ok") {
        fetchPipelineItemsData();
        showToast(
          `Deleted ${selectedIds.length} candidate(s) successfully!`,
          "success",
        );
      } else {
        throw new Error("Failed to delete candidates.");
      }

      // Dismissed only on success — closing in `finally` also fired on
      // failure, hiding the error and discarding the selection.
      setShowDeleteCandidateModal(false);
      setSelectedCandidate(null);
      setSelectedCandidates([]);
    } catch (err) {
      console.error("Candidate deletion failed:", err);
      showToast(
        err.response?.data?.message || "Failed to delete candidate(s).",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = () => {
  };

  const filters = [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "dateTime", label: "Date Created" },
        { value: "added_by", label: "Added By" },
      ],
    },
  ];

  // Previously this button only navigated back and toasted "Stage deleted" —
  // nothing was ever removed. It now dispatches the same thunk the board uses.
  const handleDeleteStage = async () => {
    setDeletingStage(true);
    try {
      // The thunk decides whether to move candidates out by reading
      // state.pipeline.columnOrder / columns. This screen only ever loads the
      // one stage, so that order can be wrong — refresh the real stage list
      // first, then reload this stage's items, because fetchPipelineStages
      // resets every taskIds array to empty and the thunk needs them to know
      // there are candidates to move.
      if (pipeline?.id) {
        await dispatch(
          fetchPipelineStages({ pipelineId: pipeline.id, ...authTokens }),
        ).unwrap();
        await dispatch(
          fetchPipelineItems({ stageId: pipelineStageId, ...authTokens }),
        ).unwrap();
      }

      await dispatch(
        deletePipelineStage({ id: pipelineStageId, ...authTokens }),
      ).unwrap();
      showToast("Stage deleted", "success");
      navigate(-1);
    } catch (error) {
      showToast(
        error?.message || "Failed to delete stage. Please try again.",
        "error",
      );
      // Re-thrown so the modal stays open on failure.
      throw error;
    } finally {
      setDeletingStage(false);
    }
  };

  const handleEditCandidate = (stageId, taskId) => {
    navigate(`/client/client-single/${pipelineStageId}/${taskId}`);
  };

  return (
    <div className="manage-column-container">
      {/* Header */}
      <div className="manage-column-header" onClick={() => navigate(-1)}>
        <button className="manage-back-button">
          <FaArrowLeft />
          Back
        </button>
        <h1>{draft.name || "Pipeline Stage"}</h1>
        <button
          className="manage-back-button"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <FaArrowLeft />
          Back
        </button>
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
          className={`tab ${activeTab === "candidates" ? "active" : ""}`}
          onClick={() => setActiveTab("candidates")}
        >
          Intake Candidates
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
              onChange={(e) => dispatch(updateDraft({ name: e.target.value }))}
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
                className="color-picker-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: "20px",
                }}
              >
                <label style={{ marginRight: "10px" }}>Colour code</label>
                <div
                  className="color-preview"
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowColorPicker(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setShowColorPicker(true);
                  }}
                  title="Change colour"
                  style={{
                    backgroundColor: draft.colorCode || "#000000",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "inline-block",
                    cursor: "pointer",
                  }}
                />
                <button
                  className="change-button"
                  onClick={() => setShowColorPicker(true)}
                  style={{
                    marginLeft: "auto",
                    color: "#0000EE",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Change
                </button>
              </div>
            </div>
            {showColorPicker && (
              <ColorPicker
                color={draft.colorCode}
                onChange={(color) => dispatch(updateDraft({ colorCode: color }))}
                onClose={() => setShowColorPicker(false)}
              />
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "space-between",
              }}
            >
              <Button
                variant="secondary-danger"
                width="200px"
                label="Delete this Column"
                onClick={() => setShowDeleteStageModal(true)}
              />
              <div className="save-button-container">
                <Button
                  label="Save Changes"
                  icon={<FaSave />}
                  onClick={handleSaveBasicInfo}
                  loading={isSaving}
                  disabled={isSaving}
                  width="auto"
                />
              </div>
            </div>
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
                onClick={() => setShowAddClientModal(true)}
                disabled={isCreatingCandidate}
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
                      setShowDeleteCandidateModal,
                      navigate,
                    }),
                }))}
                showActions={true}
                itemsPerPage={15}
                tableName="ManageColumn"
                onSelectionChange={(selectedRows, selectedItems) => {
                  const selectedIds = selectedItems.map((item) => item.id);
                  setSelectedCandidates(selectedIds);
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
      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onSubmit={handleAddCandidate}
        initialData={null}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteStageModal}
        onClose={() => setShowDeleteStageModal(false)}
        onConfirm={handleDeleteStage}
        title="Delete this stage?"
        message="Candidates in this stage will be moved to the first stage. The first stage cannot be deleted while it still holds candidates. This cannot be undone."
        confirmButtonText="Delete stage"
        confirmButtonLoading={deletingStage}
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

      {(status === "loading" || isSaving || isCreatingCandidate) && (
        <SectionLoader />
      )}
    </div>
  );
};

// Table configuration
const columns = [
  { key: "client", header: "Candidate Name", type: "text" },
  { key: "dateTime", header: "Date Created", type: "dateTime" },
  { key: "added_by", header: "Added by", type: "text" },
];

const actions = [
  // Standalone Icon Actions
  {
    type: "icon",
    label: "Delete",
    icon: <BsTrash size={20} />,
    onClick: (
      item,
      {
        setSelectedCandidate,
        setSelectedCandidates,
        setShowDeleteCandidateModal,
      },
    ) => {
      setSelectedCandidate(item);
      setSelectedCandidates([item.id]);
      setShowDeleteCandidateModal(true);
    },
    className: "delete-icon",
  },
  {
    type: "icon",
    label: "Edit",
    icon: <FiEdit2 size={20} />,
    onClick: (item, { navigate }) => {
      navigate(`/client/client-single/${item.columnId}/${item.id}`);
    },
    className: "",
  },
];

export default ManageColumn;
