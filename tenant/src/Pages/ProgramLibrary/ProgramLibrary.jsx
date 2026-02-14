import React, { useState, useEffect } from "react";
import DashboardLayout from "../../Layout/TenantLayout";
import Button from "../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../Components/Table/CustomTable";
import AddDomainModal from "../../Components/ReusableModal/ProgramLibraryModal/AddDomainModal";
import DeleteLibraryModal from "../../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal";
import DomainLibrary from "./DomainLibrary";
import { useSelector } from "react-redux";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/ProgramLibraryApis";
import LoadingSpinner from "../../Components/LoadingSpinner";

const ProgramLibrary = () => {
  /* ----------  state  ---------- */
  const [view, setView] = useState("skillAcquisition");          // active tab
  const [currentView, setCurrentView] = useState("programLibrary");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedRow, setSelectedRow] = useState(null);
  const [tableData, setTableData] = useState([]);               // live data
  const [loading, setLoading] = useState(true);

  /* ----------  auth  ---------- */
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.accessToken);
  const refreshToken = useSelector((s) => s.authentication?.user?.refreshToken);

  /* ----------  helpers  ---------- */
  const domainType = view === "skillAcquisition" ? "SKILL_ACQUISITION" : "BEHAVIOR_REDUCTION";

const fetchDomains = async () => {
  if (!tenantId) return;
  setLoading(true);
  try {
    const { data: payload } = await api.GetProgramsDomainByTenantId({
      tenantId,
      domainType,
      accessToken,
      refreshToken,
    });

    /*  NEW: payload.data is the array  */
    setTableData(
      (payload?.data || []).map((d) => ({
        id: d.id,
        domain: d.name,
        description: d.description,
        hasActions: true,
      }))
    );
  } catch (e) {
    showToast("error", e.message || "Could not load domains");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, view]);

  /* ----------  table config  ---------- */
  const columns = [
    { header: "Domain", key: "domain", type: "text" },
    { header: "Description", key: "description", type: "text" },
  ];

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: (row) => {
            setSelectedRow(row);
            setCurrentView("domainLibrary");
          },
        },
        {
          label: "Edit",
          onClick: (row) => {
            setSelectedRow(row);
            setModalMode("edit");
            setIsAddModalOpen(true);
          },
        },
        {
          label: "Duplicate",
          onClick: async (row) => {
            try {
              await api.CreateProgramsDomain({
                name: `${row.domain} (Copy)`,
                description: row.description,
                tenantId,
                domainType,
                accessToken,
                refreshToken,
              });
              showToast("success", "Domain duplicated");
              fetchDomains();
            } catch (e) {
              showToast("error", e.message);
            }
          },
        },
        {
          label: "Delete",
          onClick: (row) => {
            setSelectedRow(row);
            setIsDeleteModalOpen(true);
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  /* ----------  handlers  ---------- */
  const handleAddDomain = () => {
    setSelectedRow(null);
    setModalMode("add");
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
    setSelectedRow(null);
  };

 const handleAddModalSubmit = async (formData) => {
  try {
    let response;
    if (modalMode === "add") {
      response = await api.CreateProgramsDomain({
        name: formData.domainName,
        description: formData.domainDescription,
        tenantId,
        domainType,
        accessToken,
        refreshToken,
      });
    } else {
      response = await api.editProgramsDomain({
        id: selectedRow.id,
        name: formData.domainName,
        description: formData.domainDescription,
        domainType,
        accessToken,
        refreshToken,
      });
    }
    showToast(response.data.message, "success");
    fetchDomains();
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    handleAddModalClose();
  }
};



  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setSelectedRow(null);
  };

const handleDeleteConfirm = async () => {
  try {
    const response = await api.deleteProgramsDomain({
      id: selectedRow.id,
      accessToken,
      refreshToken,
    });
    
    showToast(response.data.message, "success"); 
    fetchDomains();
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    handleDeleteModalClose();
  }
};

  const handleBackToProgramLibrary = () => {
    setCurrentView("programLibrary");
    setSelectedRow(null);
  };

  /* ----------  render  ---------- */
  return (
    <DashboardLayout>
      <div>
        {currentView === "programLibrary" ? (
          <>
            <h1 className="appointment-sched-title">Program Library</h1>
            <h3 className="text-xl text-gray-700 font-500">Setup and manage treatment programs here</h3>

            <div className="appointment-sched-view-switcher">
              <button
                onClick={() => setView("skillAcquisition")}
                className={`appointment-sched-view-button flex items-center ${
                  view === "skillAcquisition" ? "appointment-sched-view-button-active" : "appointment-sched-view-button-inactive"
                }`}
              >
                <span>Skill Acquisition</span>
              </button>
              <button
                onClick={() => setView("behaviourReduction")}
                className={`appointment-sched-view-button flex items-center ${
                  view === "behaviourReduction" ? "appointment-sched-view-button-active" : "appointment-sched-view-button-inactive"
                }`}
              >
                <span>Behaviour Reduction</span>
              </button>
            </div>

            <div className="justify-end flex mt-6">
              <Button
                label="Add a new Domain"
                variant="primary"
                icon={<FaPlus />}
                onClick={handleAddDomain}
              />
            </div>


            <div className="mt-6">
              <CustomTable
                data={tableData}
                columns={columns}
                actions={actions}
                showActions={true}
                showCheckbox={false}
                itemsPerPage={10}
                tableName="Domain"
                loading={loading}
              />
            </div>
          </>
        ) : (
          <DomainLibrary
            selectedRow={selectedRow}
            domainName={selectedRow?.domain}
            onBack={handleBackToProgramLibrary}
            domainId={selectedRow?.id}
          />
        )}

        <AddDomainModal
          isOpen={isAddModalOpen}
          onClose={handleAddModalClose}
          onSubmit={handleAddModalSubmit}
          type={view === "skillAcquisition" ? "Skill Acquisition" : "Behaviour Reduction"}
          mode={modalMode}
          initialData={selectedRow}
        />

        <DeleteLibraryModal
          isOpen={isDeleteModalOpen}
          onClose={handleDeleteModalClose}
          onDelete={handleDeleteConfirm}
          rowData={selectedRow}
        />
      </div>
    </DashboardLayout>
  );
};

export default ProgramLibrary;