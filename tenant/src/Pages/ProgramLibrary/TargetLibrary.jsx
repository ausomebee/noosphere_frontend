import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import useAuth from "../../hooks/useAuth";
import usePermissions from "../../hooks/usePermissions";
import Button from "../../Components/Button/Button";
import AddTargetModal from "../../Components/ReusableModal/ProgramLibraryModal/AddTargetModal";
import DeleteLibraryModal from "../../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal";
import CustomTable from "../../Components/Table/CustomTable";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/ProgramLibraryApis";

const columns = [
  { header: "Target", key: "targetName", type: "text" },
  { header: "Description", key: "targetDescription", type: "text" },
];

const TargetLibrary = ({ programName, domainName, onBack, programId }) => {
  const [targets, setTargets] = useState([]);
  const [selectedTargetRow, setSelectedTargetRow] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [loading, setLoading] = useState(true);

  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const fetchTargets = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const { data: payload } = await api.GetProgramsTargetsByProgramId({
        programId,
        accessToken,
        refreshToken,
      });
      setTargets(
        (payload?.data || []).map((t) => ({
          id: t.id,
          targetName: t.name,
          targetDescription: t.description,
          hasActions: true,
        })),
      );
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const handleAddTarget = () => {
    setModalMode("add");
    setSelectedTargetRow(null);
    setIsAddModalOpen(true);
  };

  const getFullTarget = async (Id) => {
    const { data } = await api.GetProgramsTargetById({
      Id,
      accessToken,
      refreshToken,
    });
    return data.data; // the complete object
  };

  const handleEditTarget = async (row) => {
    const full = await getFullTarget(row.id); // ← fetch details
    setModalMode("edit");

    /* same mapper you already had – but now we have real fields */
    const forForm = {
      id: full.id,
      name: full.name,
      description: full.description,
      sd: full.sd,
      expectedResponse: full.expectedResponse,
      teachingProcedure: full.teachingProcedure,
      teachingOthers: full.teachingOthers || "",
      promptingStrategy: (full.promptingStrategy || []).map((s) =>
        typeof s === "string" ? JSON.parse(s).value : s,
      ),
      numberOfTrials: full.numberOfTrials || "",
      numberOfTasks: full.numberOfTasks || "",
      promptOthers: full.promptOthers || "",
      dataCollectionType: full.dataCollectionType,
      percentageCorrectTrialSession: full.numberOfTrials || "",
      trialOrOpportunitiesSession: full.numberOfTasks || "",
      taskSteps: full.taskSteps || [],
      baselineDataRequired: full.baselineDataRequired,
      masteryMetric: full.masteryMetric,
      masteryCriteria: full.masteryCriteria || {},
      statusAndAdmin: full.initialStatus,
      note: full.notes || "",
      attachment: full.attachment || null,
    };

    setSelectedTargetRow(forForm);
    setIsAddModalOpen(true);
  };
  const handleDeleteTarget = (row) => {
    setSelectedTargetRow(row);
    setIsDeleteModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    try {
      const response =
        modalMode === "add"
          ? await api.CreateProgramsTarget({
              formData,
              accessToken,
              refreshToken,
            })
          : await api.editProgramsTarget({
              formData,
              accessToken,
              refreshToken,
            });

      showToast(response.data.message, "success");
      fetchTargets();
      setIsAddModalOpen(false);
      setSelectedTargetRow(null);
    } catch (e) {
      showToast(e.message || "Failed to save target", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.deleteProgramsTarget({
        id: selectedTargetRow.id,
        accessToken,
        refreshToken,
      });
      showToast("Target deleted", "success");
      fetchTargets();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedTargetRow(null);
    }
  };

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          // In the Program Library, viewing a target opens the setup modal
          // (prefilled, editable) rather than the target data page. The data
          // page is only shown when viewing a target from a client profile.
          label: "View",
          onClick: handleEditTarget,
        },
        hasPermission("edit_target") && { label: "Edit", onClick: handleEditTarget },
        hasPermission("create_target") && {
          label: "Duplicate",
          onClick: async (row) => {
            try {
              const full = await getFullTarget(row.id);

              await api.DuplicateProgramsTarget({
                id: full.id,
                accessToken,
                refreshToken,
              });
              showToast("Target duplicated", "success");
              fetchTargets();
            } catch (e) {
              showToast(e.message, "error");
            }
          },
        },
        hasPermission("delete_target") && { label: "Delete", onClick: handleDeleteTarget, className: "remove" },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  return (
    <div className="p-6">
      <div className="program-column-header flex gap-4 items-center">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft />
          <span className="primary-text">Back</span>
        </button>
        <div className="breadcrumb-trail">
          <span className="breadcrumb-segment">Program Library</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-segment">{domainName}</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{programName}</span>
        </div>
      </div>

      {hasPermission("create_target") && (
        <div className="flex justify-end mt-6">
          <Button
            label="Add a new Target"
            variant="primary"
            icon={<FaPlus />}
            onClick={handleAddTarget}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={targets}
          columns={columns}
          actions={actions}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Targets"
          loading={loading}
        />
      </div>

      <AddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        initialData={selectedTargetRow}
        programId={programId}
      />

      <DeleteLibraryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteConfirm}
        rowData={selectedTargetRow}
      />
    </div>
  );
};

export default TargetLibrary;
