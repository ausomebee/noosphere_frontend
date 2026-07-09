// src/pages/Client/ClientSubs/ViewPrograms.jsx (Targets Tab)
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaChevronDown, FaArrowLeft } from "react-icons/fa";
import Button from "../../../../../../Components/Button/Button";
import CustomTable from "../../../../../../Components/Table/CustomTable";
import AddTargetModal from "../../../../../../Components/ReusableModal/ProgramLibraryModal/AddTargetModal";
import DeleteLibraryModal from "../../../../../../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal";
import TargetLibraryModal from "../../../../../../Components/ReusableModal/ClientModal/TargetLibraryModal";
import { showToast } from "../../../../../../Helper/ShowToast";
import api from "../../../../../../api/clientPanelApis";
import useAuth from "../../../../../../hooks/useAuth";


const ViewPrograms = () => {
  const navigate = useNavigate();
  const { clientId, programId } = useParams();
  const [searchParams] = useSearchParams(); // Correct hook usage

  // Extract query parameters safely
  const clientName = searchParams.get("client") || "Client";
  const programName = searchParams.get("name") || "Program";
  const triggerRef = useRef(null);

  const { tenantId, accessToken, refreshToken } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedTargetRow, setSelectedTargetRow] = useState(null);

  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [libraryTargets, setLibraryTargets] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Fetch targets for this program
  const fetchTargets = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const response = await api.GetProgramsTargetsByProgramId({
        programId,
        accessToken,
        refreshToken,
      });

      const data = response.data.data || [];
      setTargets(
        data.map((t) => ({
          id: t.id,
          targetName: t.name,
          description: t.description || "—",
          hasActions: true,
          rawData: t,
        }))
      );
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  };

  // Fetch tenant's target library
  const fetchLibraryTargets = async () => {
    if (!tenantId) return;
    setLibraryLoading(true);
    try {
      const response = await api.GetAllTargetByTenantId({
        Id: tenantId,
        accessToken,
        refreshToken,
      });

      const data = response.data.data || [];

      setLibraryTargets(
        data.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
        }))
      );
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [programId]);

  // Handlers
  const handleImportTarget = async (targetId, targetName) => {
    try {
      await api.AttachTargetToClient({
        clientId,
        targetId,
        programId,
        accessToken,
        refreshToken,
      });

      showToast(`"${targetName}" imported successfully`, "success");
      fetchTargets();
    } catch (e) {
      showToast(
        e.response?.data?.message || e.message || "Failed to import target",
        "error"
      );
    } finally {
      setIsLibraryOpen(false); // Always close modal
    }
  };

  const handleEditTarget = async (row) => {
    setModalMode("edit");
    setSelectedTargetRow(row);
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
          ? await api.CreateProgramsTargetByClientId({
              clientId,
              programId,
              formData,
              accessToken,
              refreshToken,
            })
          : await api.editProgramsTargetByClientId({
              clientId,
              programId,
              formData,
              accessToken,
              refreshToken,
            });

      showToast(response.data.message || "Target saved", "success");
      fetchTargets();
      setIsAddModalOpen(false);
    } catch (e) {
      showToast(e.message || "Operation failed", "error");
      throw e;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.deleteProgramsTarget({
        id: selectedTargetRow.id,
        accessToken,
        refreshToken,
      });
      showToast("Target removed", "success");
      fetchTargets();
    } catch (e) {
      showToast(e.message || "Delete failed", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedTargetRow(null);
    }
  };

  const columns = [
    { header: "Target", key: "targetName", type: "text" },
    { header: "Description", key: "description", type: "text" },
  ];

  const domainName = clientName;
  const actions = [
    {
      type: "dropdown",
      label: "Actions",
      items: [
        {
          label: "View Data",
          onClick: (row) =>
            navigate(
              `/target-single/${encodeURIComponent(
                domainName
              )}/${encodeURIComponent(programName)}/${encodeURIComponent(
                row.targetName
              )}?targetId=${row.id}&clientId=${clientId}`
            ),
        },
        {
          label: "Edit Target",
          onClick: handleEditTarget,
        },
        {
          label: "Remove Target",
          onClick: handleDeleteTarget,
          className: "text-red-600",
        },
      ],
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="program-column-header flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="back-button flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <FaArrowLeft />
          <span className="font-medium">Back</span>
        </button>

        <div className="breadcrumb-trail text-gray-600">
          <span>{clientName}</span>
          <span className="mx-2">›</span>
          <span className="font-semibold text-gray-900">{programName}</span>
        </div>
      </div>

      {/* New Target Dropdown */}
      <div className="client-dropdown-wrapper flex justify-end mb-6 relative">
        <div ref={triggerRef}>
          <Button
            label="New"
            variant="primary"
            icon={<FaChevronDown />}
            iconPosition="right"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          />
        </div>

        {isDropdownOpen && (
          <div className="client-dropdown-menu w-64 z-50">
            <button
              className="client-dropdown-item"
              onClick={() => {
                fetchLibraryTargets();
                setIsLibraryOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              Target from Library
            </button>
            <button
              className="client-dropdown-item"
              onClick={() => {
                setModalMode("add");
                setSelectedTargetRow(null);
                setIsAddModalOpen(true);
                setIsDropdownOpen(false);
              }}
            >
              Custom Target
            </button>
          </div>
        )}
      </div>

      {/* Targets Table */}
      <CustomTable
        data={targets}
        columns={columns}
        actions={actions}
        loading={loading}
        tableName="Program Targets"
        itemsPerPage={10}
        showActions={true}
        showCheckbox={false}
      />

      {/* Modals */}
      <TargetLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectTarget={handleImportTarget}
        targets={libraryTargets}
        loading={libraryLoading}
      />

      <AddTargetModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedTargetRow(null);
        }}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        programId={programId}
        clientId={clientId}
        initialData={
          selectedTargetRow
            ? {
                // Core
                id: selectedTargetRow.id,
                name: selectedTargetRow.targetName,
                description:
                  selectedTargetRow.description === "—"
                    ? ""
                    : selectedTargetRow.description,
                sd: selectedTargetRow.rawData?.sd || "",
                expectedResponse:
                  selectedTargetRow.rawData?.expectedResponse || "",

                // Direct mappings
                teachingProcedure:
                  selectedTargetRow.rawData?.teachingProcedure || "",
                dataCollectionType:
                  selectedTargetRow.rawData?.dataCollectionType || "",
                baselineDataRequired: Boolean(
                  selectedTargetRow.rawData?.baselineDataRequired
                ),
                statusAndAdmin:
                  selectedTargetRow.rawData?.initialStatus ||
                  selectedTargetRow.rawData?.statusAndAdmin ||
                  "",
                note:
                  selectedTargetRow.rawData?.note ||
                  selectedTargetRow.rawData?.notes ||
                  "",
                masteryMetric: selectedTargetRow.rawData?.masteryMetric || "",
                masteryCriteria:
                  selectedTargetRow.rawData?.masteryCriteria || {},

                // Trial settings
                trialOrOpportunitiesSession:
                  selectedTargetRow.rawData?.numberOfTrials ||
                  selectedTargetRow.rawData?.numberOfTasks ||
                  "",
                percentageCorrectTrialSession:
                  selectedTargetRow.rawData?.numberOfTrials || "",

                // Task steps
                taskSteps: Array.isArray(selectedTargetRow.rawData?.taskSteps)
                  ? selectedTargetRow.rawData.taskSteps
                  : [],

                // THIS IS THE ONLY FIX NEEDED:
                promptingStrategy: (() => {
                  const raw = selectedTargetRow.rawData?.promptingStrategy;
                  if (!raw || !Array.isArray(raw)) return [];

                  return raw
                    .map((item) => {
                      // If it's a JSON string → parse it
                      if (typeof item === "string") {
                        try {
                          const parsed = JSON.parse(item);
                          return parsed.value || parsed.label || item;
                        } catch {
                          return item;
                        }
                      }
                      // If it's already an object
                      if (typeof item === "object" && item !== null) {
                        return item.value || item.label || "";
                      }
                      return item;
                    })
                    .filter(Boolean);
                })(),

                attachment: null, // Never pre-fill file input
              }
            : null
        }
      />

      <DeleteLibraryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteConfirm}
        title="Remove Target"
        message={`Are you sure you want to remove "${selectedTargetRow?.targetName}"?`}
      />
    </>
  );
};

export default ViewPrograms;

// At the very end of your file, replace buildTargetFormData:
async function buildTargetFormData(data, mode) {
  const fd = new FormData();

  if (mode === "edit" && data.id) {
    fd.append("id", data.id.toString());
  }
  fd.append("name", data.name || "");
  fd.append("description", data.description || "");
  fd.append("programId", data.programId);
  fd.append("sd", data.sd || "");
  fd.append("expectedResponse", data.expectedResponse || "");
  fd.append("teachingProcedure", data.teachingProcedure || "");
  fd.append("dataCollectionType", data.dataCollectionType || "");
  fd.append("baselineDataRequired", Boolean(data.baselineDataRequired));
  fd.append("initialStatus", data.statusAndAdmin || "");
  fd.append("notes", data.note || "");
  fd.append("masteryMetric", data.masteryMetric || "");

  // Use the array-form key so a single selection still arrives as an array
  // (the backend requires promptingStrategy to be an array).
  (data.promptingStrategy || []).forEach((str) =>
    fd.append("promptingStrategy[]", JSON.stringify({ label: str, value: str }))
  );
  if (data.promptOthers) fd.append("promptOthers", data.promptOthers);

  if (data.dataCollectionType === "Task Analysis" && data.taskSteps?.length) {
    data.taskSteps.forEach((step) => fd.append("taskSteps", step));
  }

  if (
    data.dataCollectionType === "Percentage Correct" &&
    data.percentageCorrectTrialSession
  ) {
    fd.append("numberOfTrials", Number(data.percentageCorrectTrialSession));
  }
  if (
    data.dataCollectionType === "Latency" &&
    data.percentageCorrectTrialSession
  ) {
    fd.append("numberOfTrials", Number(data.percentageCorrectTrialSession));
  }
  if (
    data.dataCollectionType === "Task Analysis" &&
    data.trialOrOpportunitiesSession
  ) {
    fd.append("numberOfTasks", Number(data.trialOrOpportunitiesSession));
  }
  if (
    data.trialOrOpportunitiesSession &&
    data.dataCollectionType !== "Task Analysis"
  ) {
    fd.append("numberOfTrials", Number(data.trialOrOpportunitiesSession));
    fd.append("numberOfTasks", Number(data.trialOrOpportunitiesSession));
  }

  fd.append("masteryCriteria", JSON.stringify(data.masteryCriteria || {}));

  if (data.attachment instanceof File) {
    fd.append("attachment", data.attachment, data.attachment.name);
  } else {
    fd.append("attachment", "");
  }

  return fd;
}
