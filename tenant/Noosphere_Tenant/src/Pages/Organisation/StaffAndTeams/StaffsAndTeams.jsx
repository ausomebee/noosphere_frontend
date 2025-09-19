import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import DashboardLayout from "../../../Layout/TenantLayout";
import Button from "../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import AddStaffModal from "../../../Components/ReusableModal/OrganizationModal/AddStaffModal";
import AddTeamsModal from "../../../Components/ReusableModal/OrganizationModal/AddTeamsModal";
import api from "../../../api/organisationStaffApis";
import { showToast } from "../../../Helper/ShowToast";

const StaffsAndTeams = () => {
  const [view, setView] = useState("staff");
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const accessToken = useSelector((s) => s.authentication?.token);
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const navigate = useNavigate();

  const fetchStaffData = async () => {
    if (view !== "staff" || !tenantId) return;
    setLoading(true);
    try {
      const res = await api.GetAllStaffByTenantId({ tenantId, accessToken });
      const rows = (res.data?.data || []).map((u) => ({
        id: u.id,
        name: u.fullName,
        role: u.role.name,
        dateJoined: new Date(u.createdAt).toLocaleDateString(),
        status: u.active ? "Active" : "Inactive",
        raw: u,
        hasActions: true,
      }));
      setStaffData(rows);
    } catch (err) {
      showToast({ message: err.message || "Failed to load staff data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [view, tenantId, accessToken, refreshTrigger]);

  const staffColumns = [
    { header: "Staff Name", key: "name", type: "text" },
    { header: "Role", key: "role", type: "text" },
    { header: "Date Joined", key: "dateJoined", type: "text" },
    { header: "Status", key: "status", type: "statusText" },
  ];

  const teamColumns = [
    { header: "Team Name", key: "name", type: "text" },
    { header: "Number of Members", key: "noMembers", type: "text" },
    { header: "Date Created", key: "dateCreated", type: "text" },
    { header: "Team Lead", key: "teamLead", type: "text" },
  ];

  const teamsData = [
    {
      id: "1",
      name: "Georgia Team",
      noMembers: "14",
      dateCreated: "12/10/2024",
      teamLead: "Peter Matson",
      hasCheckbox: true,
      hasActions: true,
    },
  ];

  const staffActions = [
    {
      type: "dropdown",
      label: "More",
      className: "more-dropdown",
      items: [
        {
          label: "View Staff Information",
          onClick: (row) =>
            navigate(
              `/organization/staff-and-teams/single-staff/${row.id}?name=${encodeURIComponent(row.name)}`
            ),
        },
        {
          label: "Edit Staff Information",
          onClick: async (row) => {
            try {
              const res = await api.GetSingleTenantStaffById({ id: row.id, accessToken });
              const staffData = res.data?.data;
              const formattedData = {
                id: staffData.staff.id,
                fullName: staffData.staff.fullName,
                email: staffData.staff.email,
                phoneNumber: staffData.staff.phoneNumber,
                DOB: staffData.staff.dob
                  ? new Date(staffData.staff.dob).toISOString().split("T")[0]
                  : "",
                gender: staffData.staff.gender,
                practiceNPI: staffData.staff.npi,
                address: staffData.staff.address,
                city: staffData.staff.city,
                state: staffData.staff.state,
                zip: staffData.staff.zip,
                country: staffData.staff.country,
                active: staffData.staff.active,
                staffRole: staffData.staff.roleId,
                licenses: staffData.license.map((l) => ({
                  id: l.id,
                  licenseName: l.licenseName,
                  licenseNumber: l.licenseNumber,
                  state: l.issueState,
                  expiryDate: l.expiryDate
                    ? new Date(l.expiryDate).toISOString().split("T")[0]
                    : "",
                  tenantStaffId: l.tenantStaffId,
                })),
                payroll: {
                  id: staffData.payroll?.id,
                  paymentSchedule: staffData.payroll?.paymentSchedule || "",
                  ratePerHour: staffData.payroll?.ratePerHour || "",
                  minimumHours: staffData.payroll?.minimumHours || "",
                  otherPays: staffData.payroll?.otherPays?.length
                    ? staffData.payroll.otherPays.map((p) => ({
                        type: p.type,
                        rate: p.rate,
                      }))
                    : [{ type: "", rate: "" }],
                  deductions: staffData.payroll?.deductions?.length
                    ? staffData.payroll.deductions.map((d) => ({
                        type: d.type,
                        rate: d.rate,
                      }))
                    : [{ type: "", rate: "" }],
                  tenantStaffId: staffData.payroll?.tenantStaffId,
                },
                documents: staffData.document.map((d) => ({
                  id: d.id,
                  documentsUrl: { filename: d.documentsUrl.filename, url: d.documentsUrl.url },
                  tenantStaffId: d.tenantStaffId,
                })),
              };
              setSelectedRow(formattedData);
              setModalMode("edit");
              setModalType("staff");
              setIsAddModalOpen(true);
            } catch (err) {
              showToast({ message: err.message || "Failed to load staff details", type: "error" });
            }
          },
        },
        {
          label: (row) => (row.status === "Active" ? "Deactivate Staff" : "Activate Staff"),
          onClick: async (row) => {
            try {
              await api.UpdateActiveTenantStaff({
                id: row.id,
                active: row.status !== "Active",
                accessToken,
              });
              setStaffData((prev) =>
                prev.map((s) =>
                  s.id === row.id
                    ? { ...s, status: row.status === "Active" ? "Inactive" : "Active" }
                    : s
                )
              );
              showToast({
                message: `Staff ${row.name} ${row.status === "Active" ? "deactivated" : "activated"} successfully`,
                type: "success",
              });
              setRefreshTrigger((prev) => prev + 1);
            } catch (err) {
              showToast({ message: err.message || "Failed to update staff status", type: "error" });
            }
          },
          className: (row) => (row.status === "Active" ? "remove" : ""),
        },
      ],
    },
  ];

  const teamsActions = [
    {
      type: "dropdown",
      label: "More",
      className: "more-dropdown",
      items: [
        {
          label: "View Team Details",
          onClick: (row) => {
            setSelectedRow(row);
            showToast({ message: `Viewing details for team ${row.name}`, type: "info" });
          },
        },
        {
          label: "Edit Team",
          onClick: (row) => {
            setSelectedRow(row);
            setModalMode("edit");
            setModalType("teams");
            setIsAddModalOpen(true);
            showToast({ message: `Editing team ${row.name}`, type: "info" });
          },
        },
        {
          label: "Deactivate Team",
          onClick: async (row) => {
            try {
              // Placeholder: Replace with actual API call
              await api.DeactivateTeam({ id: row.id, accessToken });
              showToast({ message: `Team ${row.name} deactivated successfully`, type: "success" });
            } catch (err) {
              showToast({ message: err.message || "Failed to deactivate team", type: "error" });
            }
          },
        },
        {
          label: "Delete Team",
          onClick: async (row) => {
            try {
              // Placeholder: Replace with actual API call
              await api.DeleteTeam({ id: row.id, accessToken });
              showToast({ message: `Team ${row.name} deleted successfully`, type: "success" });
            } catch (err) {
              showToast({ message: err.message || "Failed to delete team", type: "error" });
            }
          },
          className: "remove",
        },
      ],
    },
  ];

  const handleAdd = () => {
    setModalMode("add");
    setModalType(view);
    setSelectedRow(null);
    setIsAddModalOpen(true);
    
  };

  const handleStaffSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        id: modalMode === "edit" ? selectedRow?.id : undefined,
        fullName: data.fullName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        dob: data.DOB ? new Date(data.DOB).toISOString() : undefined,
        gender: data.gender || undefined,
        npi: data.practiceNPI || undefined,
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        country: data.country || "",
        active: data.active ?? true,
        roleId: "8285a9a5-0455-447d-9dbe-00ad68d6a0e5",
        tenantId: modalMode === "add" ? tenantId : selectedRow?.tenantId,
        documents: data.documents
          .filter((f) => !f.error)
          .map((f) => ({
            id: f.id,
            documentsUrl: { filename: f.filename, url: f.url },
            tenantStaffId: selectedRow?.id,
          })),
        licenses: (data.licenses || [])
          .filter((l) => l.licenseName && l.licenseNumber && l.expiryDate && l.state)
          .map((l) => ({
            id: l.id,
            licenseName: l.licenseName,
            licenseNumber: l.licenseNumber,
            issueState: l.state,
            expiryDate: new Date(l.expiryDate).toISOString(),
            tenantStaffId: selectedRow?.id,
          })),
        payroll: {
          id: selectedRow?.payroll?.id,
          paymentSchedule: data.paymentSchedule || "",
          ratePerHour: data.ratePerHour ? String(data.ratePerHour) : "",
          minimumHours: data.minimumHours ? String(data.minimumHours) : "",
          otherPays: (data.otherPays || [])
            .filter((p) => p.type && p.rate)
            .map((p) => ({ type: p.type, rate: String(p.rate) })),
          deductions: (data.deductions || [])
            .filter((d) => d.type && d.rate)
            .map((d) => ({ type: d.type, rate: String(d.rate) })),
          tenantStaffId: selectedRow?.id,
        },
      };

      modalMode === "edit"
        ? await api.UpdateTenantStaff({ ...payload, accessToken })
        : await api.CreateTenantStaff({ ...payload, accessToken });

      setIsAddModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      showToast({
        message: `Staff ${modalMode === "edit" ? "updated" : "created"} successfully`,
        type: "success",
      });
    } catch (err) {
      showToast({ message: err.message || "Failed to save staff", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSubmit = async (data) => {
    try {
      // Placeholder: Replace with actual API call
      modalMode === "edit"
        ? await api.UpdateTeam({ id: selectedRow?.id, ...data, accessToken })
        : await api.CreateTeam({ ...data, tenantId, accessToken });
      setIsAddModalOpen(false);
      showToast({
        message: `Team ${modalMode === "edit" ? "updated" : "created"} successfully`,
        type: "success",
      });
    } catch (err) {
      showToast({ message: err.message || "Failed to save team", type: "error" });
    }
  };

  const tableConfig = {
    staff: {
      data: staffData,
      columns: staffColumns,
      actions: staffActions,
      tableName: "Staff",
    },
    teams: {
      data: teamsData,
      columns: teamColumns,
      actions: teamsActions,
      tableName: "Teams",
    },
  };

  const filters = useMemo(
    () =>
      view === "staff"
        ? [
            { value: "role", label: "Role" },
            { value: "status", label: "Status" },
          ]
        : [{ value: "teamLead", label: "Team Lead" }],
    [view]
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="appointment-sched-title mb-4">Staff & Teams</h1>
        <div className="appointment-sched-view-switcher">
          <button
            onClick={() => setView("staff")}
            className={`appointment-sched-view-button flex items-center ${
              view === "staff"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => setView("teams")}
            className={`appointment-sched-view-button flex items-center ${
              view === "teams"
                ? "appointment-sched-view-button-active"
                : "appointment-sched-view-button-inactive"
            }`}
          >
            Teams
          </button>
        </div>

        <div className="flex justify-end mt-6 gap-4">
          <Button
            label={`Create ${view === "staff" ? "a new Staff" : "a new Team"}`}
            variant="primary"
            icon={<FaPlus />}
            onClick={handleAdd}
          />
        </div>

        <CustomTable
          data={tableConfig[view].data}
          columns={tableConfig[view].columns}
          actions={tableConfig[view].actions}
          filters={filters}
          showActions
          showCheckbox={false}
          itemsPerPage={10}
          loading={loading}
          tableName={tableConfig[view].tableName}
        />

        {modalType === "staff" && (
          <AddStaffModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleStaffSubmit}
            mode={modalMode}
            initialData={selectedRow}
          />
        )}

        {modalType === "teams" && (
          <AddTeamsModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleTeamSubmit}
            mode={modalMode}
            initialData={selectedRow}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default React.memo(StaffsAndTeams);