import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import { TextareaInput, TextInput } from "../Input/Inputs";
import ColorPicker from "../ColorPicker";
import Layout from "../../Layout/TenantLayout";
import Button from "../Button/Button";
import AddProspectModal from "../ReusableModal/PipelineModal/AddProspectModal";
import DeleteConfirmationModal from "../ReusableModal/PipelineModal/DeleteConfirmationModal";
import "./ManageColumn.css";
import {
  updateDraft,
  resetDraft,
  fetchSinglePipelineStages,
  fetchPipelineItems,
  updatePipelineItemActivity,
  deletePipelineItem,
} from "../../ReduxStore/features/PipelineSlice";
import CustomTable from "../Table/CustomTable";
import { showToast } from "../../Helper/ShowToast";
import LoadingSpinner from "../LoadingSpinner";
import api from "../../api/TenantApis";
import { FiEdit2 } from "react-icons/fi";
import { BsTrash } from "react-icons/bs";

const ManageColumn = () => {
  const { pipelineStageId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pipeline, draft, status, error } = useSelector((state) => state.pipeline);
  const token = useSelector((state) => state.authentication?.user?.token);

  // State management
  const [activeTab, setActiveTab] = useState("basic");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [tableDataState, setTableDataState] = useState([]);
  const [stages, setStages] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const authTokens = useMemo(
    () => ({
      accessToken: token,
      refreshToken: token,
    }),
    [token]
  );

  // Date formatting function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Fetch pipeline items
  const fetchPipelineItemsData = useCallback(() => {
    dispatch(fetchPipelineItems({ stageId: pipelineStageId, ...authTokens }))
      .unwrap()
      .then((response) => {
        const mappedData = response.items.map((item) => ({
          id: item.id,
          columnId: pipelineStageId,
          client: item.fullName || `${item.firstName} ${item.lastName}`.trim() || "Unknown Candidate",
          firstName: item.firstName || "",
          lastName: item.lastName || "",
          email: item.email || "",
          phoneNumber: item.phoneNumber || "",
          added_by: item.createdBy || "Unknown Admin",
          dateTime: formatDate(item.createdAt),
          hasActions: true,
          hasCheckbox: true,
        }));
        setTableDataState(mappedData);
      })
      .catch((err) => {
        console.error("Failed to fetch pipeline items:", err);
        showToast("Failed to load candidates.", "error");
        setTableDataState([]);
      });
  }, [dispatch, pipelineStageId, authTokens]);

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
        })) || []
      );
    } catch (err) {
      console.error("Failed to fetch stages:", err);
      showToast("Failed to load stages.", "error");
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
              })
            );
          }
        })
        .catch((err) => {
          console.error("Failed to fetch stage data:", err);
          showToast("Failed to load stage data.", "error");
        });

      fetchPipelineItemsData();
      fetchStages();
    }

    return () => dispatch(resetDraft());
  }, [pipelineStageId, dispatch, authTokens, fetchStages, fetchPipelineItemsData]);

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
      console.error("Failed to update stage:", err);
      showToast(
        err.response?.data?.message || "Failed to update stage information",
        "error"
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
      console.error("Candidate deletion failed:", err);
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
    console.log(`Filter changed: ${key} = ${value}`);
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

  const handleEditCandidate = (stageId, taskId) => {
    navigate(`/client/client-single/${pipelineStageId}/${taskId}`);
  };

  return (
    <Layout>
      <div className="manage-column-container">
        {/* Header */}
        <div className="manage-column-header" onClick={() => navigate(-1)}>
          <button className="manage-back-button">
            <FaArrowLeft />
            Back
          </button>
          <h1>{draft.name || "Pipeline Stage"}</h1>
          <button className="manage-back-button" style={{ opacity: 0, pointerEvents: "none" }}>
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
                    style={{
                      backgroundColor: draft.colorCode || "#000000",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "inline-block",
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
                  onChange={(color) => {
                    dispatch(updateDraft({ colorCode: color }));
                    setShowColorPicker(false);
                  }}
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
                  onClick={() => {
                    if (window.confirm("Delete this stage?")) {
                      navigate(-1);
                      showToast("Stage deleted", "success");
                    }
                  }}
                />
                <div className="save-button-container">
                  <Button
                    label={isSaving ? "Saving..." : "Save Changes"}
                    icon={!isSaving && <FaSave />}
                    onClick={handleSaveBasicInfo}
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
        <AddProspectModal
          isOpen={showAddProspectModal}
          onClose={() => setShowAddProspectModal(false)}
          onSave={handleAddCandidate}
          stages={stages}
          pipelineStageId={pipelineStageId}
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
    </Layout>
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
    onClick: (item, { setSelectedCandidate, setSelectedCandidates, setShowDeleteCandidateModal }) => {
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