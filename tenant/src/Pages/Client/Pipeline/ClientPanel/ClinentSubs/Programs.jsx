// Programs Tab Component - Fully Fixed (your CSS untouched)

import { useRef, useState, useEffect, useCallback } from "react";
import Button from "../../../../../Components/Button/Button";
import { FaChevronDown } from "react-icons/fa";
import CustomTable from "../../../../../Components/Table/CustomTable";
import { useNavigate, useParams } from "react-router-dom";
import AddProgramModal from "../../../../../Components/ReusableModal/ProgramLibraryModal/AddProgramModal";
import DeleteLibraryModal from "../../../../../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal";
import { showToast } from "../../../../../Helper/ShowToast";
import api2 from "../../../../../api/clientPanelApis";
import api from "../../../../../api/ProgramLibraryApis";
import ProgramLibraryModal from "../../../../../Components/ReusableModal/ClientModal/ProgramLibraryModal";
import useAuth from "../../../../../hooks/useAuth";

const ProgramsTab = ({ fullName }) => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const { tenantId, accessToken, refreshToken } = useAuth();

  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [libraryPrograms, setLibraryPrograms] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedProgramRow, setSelectedProgramRow] = useState(null);

  /* ---------- Fetch Client's Programs ---------- */
  const fetchPrograms = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const response = await api2.GetClientsProgramByClientId({
        id: clientId,
        accessToken,
        refreshToken,
      });

      const clientPrograms = response.data.data || [];

      setPrograms(
        clientPrograms.map((item) => ({
          id: item.id, // client-program link ID
          programId: item.program.id, // actual program ID
          programName: item.program.name,
          description: item.program.description || "—",
          hasActions: true,
        }))
      );
    } catch (e) {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Fetch Library Programs ---------- */
  const fetchLibraryPrograms = async () => {
    if (!tenantId) return;
    setLibraryLoading(true);
    try {
      const response = await api2.GetProgramsByTenantId({
        id: tenantId,
        accessToken,
        refreshToken,
      });

      const libraryData = response.data.data || [];
      setLibraryPrograms(
        libraryData.map((prog) => ({
          id: prog.id,
          name: prog.name,
          description: prog.description || "No description",
        }))
      );
    } catch (e) {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const Columns = [
    { header: "Program", key: "programName", type: "text" },
    { header: "Description", key: "description", type: "text" },
  ];

  /* ---------- Handlers ---------- */
  const handleAddProgram = () => {
    setModalMode("add");
    setSelectedProgramRow(null);
    setIsAddModalOpen(true);
  };

  // Fixed: Now properly sends description to edit modal
  const handleEditProgram = (row) => {
    setModalMode("edit");
    setSelectedProgramRow({
      id: row.id,
      programId: row.programId,
      programName: row.programName,
      programDescription: row.description === "—" ? "" : row.description, // This is the fix
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteProgram = (row) => {
  setSelectedProgramRow({
    programId: row.programId,
    programName: row.programName, // optional, only if modal needs it later
  });
  setIsDeleteModalOpen(true);
};

const handleDeleteConfirm = async () => {
  if (!selectedProgramRow?.programId) {
    setIsDeleteModalOpen(false);
    return;
  }

  try {
    await api2.deleteClientsProgram({
      id: selectedProgramRow.programId,
      accessToken,
      refreshToken,
    });
    showToast("Program removed successfully", "success");
    fetchPrograms();
  } catch (e) {
    showToast(e.response?.data?.message || "Failed to remove program", "error");
  } finally {
    setIsDeleteModalOpen(false);
    setSelectedProgramRow(null);
  }
};

  const handleModalSubmit = async (formData) => {
    try {
      const requestData = {
        name: formData.programName,
        description: formData.programDescription || "",
        clientId,
        accessToken,
        refreshToken,
      };

      if (modalMode === "add") {
        await api2.CreateClientsProgram(requestData);
      } else {
        await api2.EditClientsProgram({
          ...requestData,
          id: selectedProgramRow.programId,
        });
      }

      showToast(
        `Program ${modalMode === "add" ? "added" : "updated"} successfully`,
        "success"
      );
      fetchPrograms();
      setIsAddModalOpen(false);
    } catch (e) {
      showToast(
        e.response?.data?.message || e.message || "Operation failed",
        "error"
      );
    }
  };



  const handleImportProgram = (programId, programName) => {
    api2
      .AttachProgramToClient({ clientId, programId, accessToken, refreshToken })
      .then(() => {
        showToast(`"${programName}" added successfully`, "success");
        fetchPrograms();
      })
      .catch((e) => showToast(e.message || "Import failed", "error"));
  };

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View Program",
          onClick: (row) =>
            navigate(
              `/client/view-program/${clientId}/target/${
                row.programId
              }?name=${encodeURIComponent(
                row.programName
              )}&client=${encodeURIComponent(fullName)}`
            ),
        },
        { label: "Edit Program", onClick: handleEditProgram },
        {
          label: "Remove Program",
          onClick: handleDeleteProgram,
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  return (
    <div>
      <div className="client-dropdown-wrapper justify-end flex mt-6">
        <div
          ref={triggerRef}
          onClick={() => setIsProgramOpen((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          <Button
            label="New"
            variant="primary"
            icon={<FaChevronDown />}
            iconPosition="right"
          />
        </div>

        {/* Dropdown Menu - Your original classes preserved */}
        {isProgramOpen && (
          <div ref={menuRef} className="client-dropdown-menu w-200">
            <button
              className="client-dropdown-item"
              onClick={() => {
                fetchLibraryPrograms();
                setIsLibraryModalOpen(true);
                setIsProgramOpen(false);
              }}
            >
              <span>Program from Library</span>
            </button>

            <button
              className="client-dropdown-item"
              onClick={() => {
                handleAddProgram();
                setIsProgramOpen(false);
              }}
            >
              <span>Custom Program</span>
            </button>
          </div>
        )}
      </div>

      <div>
        <CustomTable
          data={programs}
          columns={Columns}
          actions={actions}
          filters={[]}
          itemsPerPage={10}
          tableName="Programs"
          loading={loading}
          showActions={true}
          showCheckbox={false}
        />
      </div>

      {/* Modals */}
      <ProgramLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onSelectProgram={handleImportProgram}
        programs={libraryPrograms}
        loading={libraryLoading}
      />

      <AddProgramModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={selectedProgramRow || {}}
        mode={modalMode}
      />

      <DeleteLibraryModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProgramRow(null);
        }}
        onDelete={handleDeleteConfirm}
        title="Remove Program"
      />
    </div>
  );
};

export default ProgramsTab;
