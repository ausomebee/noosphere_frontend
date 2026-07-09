import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import useAuth from "../../hooks/useAuth";
import usePermissions from "../../hooks/usePermissions";
import Button from "../../Components/Button/Button";
import AddProgramModal from "../../Components/ReusableModal/ProgramLibraryModal/AddProgramModal";
import DeleteLibraryModal from "../../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal";
import CustomTable from "../../Components/Table/CustomTable";
import TargetLibrary from "./TargetLibrary";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/ProgramLibraryApis";

const columns = [
  { header: "Program", key: "programName", type: "text" },
  { header: "Description", key: "programDescription", type: "text" },
];

const DomainLibrary = ({ domainName, onBack, domainId }) => {
  /* ----------  state  ---------- */
  const [programs, setPrograms] = useState([]);
  const [selectedProgramRow, setSelectedProgramRow] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentView, setCurrentView] = useState("programLibrary");
  const [loading, setLoading] = useState(true);

  /* ----------  auth  ---------- */
    const { accessToken, refreshToken } = useAuth();
    const { hasPermission } = usePermissions();

  /* ----------  fetch programs  ---------- */
  const fetchPrograms = async () => {
    if (!domainId) return;
    setLoading(true);
    try {
      const response = await api.GetProgramsProgramsByDomainId({
        domainId,
        accessToken,
        refreshToken,
      });

      // Extract the programs data from the response
      const programsData = response.data.data || [];

      // Map the data to match your table structure
      setPrograms(
        programsData.map((program) => ({
          id: program.id,
          programName: program.name,
          programDescription: program.description,
          hasActions: true,
        }))
      );
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId]);

  /* ----------  handlers  ---------- */
  const handleAddProgram = () => {
    setModalMode("add");
    setSelectedProgramRow(null);
    setIsAddModalOpen(true);
  };

  const handleEditProgram = (row) => {
    setModalMode("edit");
    setSelectedProgramRow(row);
    setIsAddModalOpen(true);
  };

  const handleDeleteProgram = (row) => {
    setSelectedProgramRow(row);
    setIsDeleteModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    try {
      let response;

      // Prepare the request data
      const requestData = {
        name: formData.programName,
        description: formData.programDescription,
        domainId: domainId,
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      if (modalMode === "add") {
        response = await api.CreateProgramsProgram(requestData);
      } else {
        // For edit, include the program ID
        response = await api.editProgramsProgram({
          ...requestData,
          id: selectedProgramRow.id,
        });
      }

      showToast(response.data.message, "success");
      fetchPrograms();
      setIsAddModalOpen(false);
    } catch (e) {
      showToast(
        e.response?.data?.message || e.message || "Operation failed",
        "error"
      );
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.deleteProgramsProgram({
        id: selectedProgramRow.id,
        accessToken,
        refreshToken,
      });

      showToast("Program deleted successfully", "success");
      fetchPrograms();
    } catch (e) {
      showToast(
        e.response?.data?.message || e.message || "Delete failed",
        "error"
      );
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedProgramRow(null);
    }
  };

  const handleBackToPrograms = () => {
    setCurrentView("programLibrary");
    setSelectedProgramRow(null);
  };

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: (row) => {
            setSelectedProgramRow(row);
            setCurrentView("targetLibrary");
          },
        },
        hasPermission("edit_program") && {
          label: "Edit",
          onClick: handleEditProgram,
        },
        hasPermission("create_program") && {
          label: "Duplicate",
          onClick: async (row) => {
            try {
              await api.CreateProgramsProgram({
                name: `${row.programName} (Copy)`,
                description: row.programDescription,
                domainId,
                accessToken,
                refreshToken,
              });
              showToast("Program duplicated", "success");
              fetchPrograms();
            } catch (e) {
              showToast(e.message, "error");
            }
          },
        },
        hasPermission("delete_program") && {
          label: "Delete",
          onClick: handleDeleteProgram,
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  /* ----------  render  ---------- */
  return (
    <div className="p-6">
      {currentView === "programLibrary" ? (
        <>
          <div className="program-column-header flex gap-4 items-center">
            <button className="back-button" onClick={onBack}>
              <FaArrowLeft />
              <span className="primary-text">Back</span>
            </button>

            <div className="breadcrumb-trail">
              <span className="breadcrumb-segment">Program Library</span>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">{domainName}</span>
            </div>
          </div>

          {hasPermission("create_program") && (
            <div className="flex justify-end mt-6">
              <Button
                label="Add a new Program"
                variant="primary"
                icon={<FaPlus />}
                onClick={handleAddProgram}
              />
            </div>
          )}

          <div className="mt-6">
            <CustomTable
              data={programs}
              columns={columns}
              actions={actions}
              showActions={true}
              showCheckbox={false}
              itemsPerPage={10}
              tableName="Program"
              loading={loading}
            />
          </div>
        </>
      ) : (
        <TargetLibrary
          programName={selectedProgramRow?.programName}
          onBack={handleBackToPrograms}
          domainName={domainName}
          programId={selectedProgramRow?.id}
        />
      )}

      <AddProgramModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedProgramRow(null);
        }}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        initialData={selectedProgramRow}
        key={`${modalMode}-${selectedProgramRow?.id || "new"}`} // Force re-render
      />

      <DeleteLibraryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteConfirm}
        rowData={selectedProgramRow}
      />
    </div>
  );
};

export default DomainLibrary;
