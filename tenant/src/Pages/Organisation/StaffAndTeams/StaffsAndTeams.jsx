import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import Button from "../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import AddStaffModal from "../../../Components/ReusableModal/OrganizationModal/AddStaffModal";
import AddTeamsModal from "../../../Components/ReusableModal/OrganizationModal/AddTeamsModal";
import api from "../../../api/organisationStaffApis";
import { showToast } from "../../../Helper/ShowToast";
import "../../../Components/CalendarScheduler/Scheduler.css";
const StaffsAndTeams = () => {
  const [view, setView] = useState("staff");
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [staffData, setStaffData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Teams state
  const [rawTeams, setRawTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamAccessStaff, setTeamAccessStaff] = useState([]);
  const [allTenantStaff, setAllTenantStaff] = useState([]);

  const { accessToken, refreshToken, tenantId } = useAuth();
  const navigate = useNavigate();

  // Team Lead options – only staff with team-level access
  const teamLeadOptions = useMemo(
    () => teamAccessStaff.map((s) => ({ value: s.id, label: s.fullName })),
    [teamAccessStaff],
  );

  // Team Member options – all tenant staff
  const memberOptions = useMemo(
    () => allTenantStaff.map((s) => ({ value: s.id, label: s.fullName })),
    [allTenantStaff],
  );

  // Lookup map: staffId → fullName (for resolving teamLeadId in table)
  const staffLookup = useMemo(() => {
    const map = {};
    allTenantStaff.forEach((s) => { map[s.id] = s.fullName; });
    teamAccessStaff.forEach((s) => { map[s.id] = s.fullName; });
    return map;
  }, [allTenantStaff, teamAccessStaff]);

  // Fetch staff with team access (for team lead dropdown + name resolution)
  // and all tenant staff (for team members dropdown)
  useEffect(() => {
    const fetchStaffForTeams = async () => {
      if (!tenantId) return;
      try {
        const [teamAccessRes, allStaffRes] = await Promise.all([
          api.GetStaffWithTeamAccess({ tenantId, accessToken, refreshToken }),
          api.GetAllStaffByTenantId({ tenantId, accessToken, refreshToken }),
        ]);
        setTeamAccessStaff(teamAccessRes.data?.data || []);
        setAllTenantStaff(allStaffRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load staff lists:", err);
      }
    };
    fetchStaffForTeams();
  }, [tenantId, accessToken]);

  const fetchStaffData = async () => {
    if (view !== "staff" || !tenantId) return;
    setLoading(true);
    try {
      const res = await api.GetAllStaffByTenantId({ tenantId, accessToken, refreshToken });
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
      showToast({
        message: err.message || "Failed to load staff data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams data
  const fetchTeamsData = async () => {
    if (!tenantId) return;
    setTeamsLoading(true);
    try {
      const res = await api.GetAllTeamsByTenantId({ tenantId, accessToken, refreshToken });
      setRawTeams(res.data?.data || []);
    } catch (err) {
      showToast({ message: err.message || "Failed to load teams", type: "error" });
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (view === "staff") fetchStaffData();
    if (view === "teams") fetchTeamsData();
  }, [view, tenantId, accessToken, refreshTrigger]);

  // Derive teams table rows from raw data
  const teamsData = useMemo(
    () =>
      rawTeams.map((t) => ({
        id: t.id,
        name: t.name,
        noMembers: t._count?.teamMembers ?? t.teamMembers?.length ?? "—",
        dateCreated: new Date(t.createdAt).toLocaleDateString(),
        teamLead: t.teamLead?.fullName || staffLookup[t.teamLeadId] || "—",
        teamLeadId: t.teamLeadId,
        teamMemberNames: (t.teamMembers || [])
          .map((m) => m.staff?.fullName)
          .filter(Boolean)
          .join(", ") || "—",
        teamMembers: t.teamMembers || [],
        isActive: t.isActive,
        raw: t,
        hasActions: true,
      })),
    [rawTeams, staffLookup],
  );

  const staffColumns = [
    { header: "Staff Name", key: "name", type: "text" },
    { header: "Role", key: "role", type: "text" },
    { header: "Date Joined", key: "dateJoined", type: "text" },
    { header: "Status", key: "status", type: "statusText" },
  ];

  const teamColumns = [
    { header: "Team Name", key: "name", type: "text" },
    { header: "Team Members", key: "teamMemberNames", type: "text" },
    { header: "Number of Members", key: "noMembers", type: "text" },
    { header: "Date Created", key: "dateCreated", type: "text" },
    { header: "Team Lead", key: "teamLead", type: "text" },
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
              `/organization/staff-and-teams/single-staff/${row.id}?name=${encodeURIComponent(row.name)}`,
            ),
        },
        {
          label: "Edit Staff Information",
          onClick: async (row) => {
            try {
              const res = await api.GetSingleTenantStaffById({
                id: row.id,
                accessToken,
              });
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
                  otherPays: staffData.payroll?.incomeItems?.length
                    ? staffData.payroll.incomeItems.map((p) => ({
                        type: p.id,
                      }))
                    : [{ type: "" }],
                  deductions: staffData.payroll?.deductions?.length
                    ? staffData.payroll.deductions.map((d) => ({
                        type: d.id,
                      }))
                    : [{ type: "" }],
                  tenantStaffId: staffData.payroll?.tenantStaffId,
                },
                documents: staffData.document.map((d) => ({
                  id: d.id,
                  documentsUrl: {
                    filename: d.documentsUrl.filename,
                    url: d.documentsUrl.url,
                  },
                  tenantStaffId: d.tenantStaffId,
                })),
              };
              setSelectedRow(formattedData);
              setModalMode("edit");
              setModalType("staff");
              setIsAddModalOpen(true);
            } catch (err) {
              showToast({
                message: err.message || "Failed to load staff details",
                type: "error",
              });
            }
          },
        },
        {
          label: (row) =>
            row.status === "Active" ? "Deactivate Staff" : "Activate Staff",
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
                    ? {
                        ...s,
                        status: row.status === "Active" ? "Inactive" : "Active",
                      }
                    : s,
                ),
              );
              showToast({
                message: `Staff ${row.name} ${row.status === "Active" ? "deactivated" : "activated"} successfully`,
                type: "success",
              });
              setRefreshTrigger((prev) => prev + 1);
            } catch (err) {
              showToast({
                message: err.message || "Failed to update staff status",
                type: "error",
              });
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
          label: "Edit Team",
          onClick: (row) => {
            // Extract staffIds from teamMembers for the multi-select
            const memberIds = (row.teamMembers || []).map((m) => m.staff?.id);
            setSelectedRow({
              id: row.id,
              teamName: row.name,
              teamMember: memberIds,
              teamLead: row.teamLeadId || "",
            });
            setModalMode("edit");
            setModalType("teams");
            setIsAddModalOpen(true);
          },
        },
        {
          label: (row) => row.isActive ? "Deactivate Team" : "Activate Team",
          onClick: async (row) => {
            try {
              await api.ToggleTeamActive({ id: row.id, active: !row.isActive, accessToken, refreshToken });
              showToast({
                message: `Team ${row.name} ${row.isActive ? "deactivated" : "activated"} successfully`,
                type: "success",
              });
              setRefreshTrigger((prev) => prev + 1);
            } catch (err) {
              showToast({
                message: err.message || "Failed to update team status",
                type: "error",
              });
            }
          },
        },
        {
          label: "Delete Team",
          onClick: async (row) => {
            try {
              await api.DeleteTeam({ id: row.id, accessToken, refreshToken });
              showToast({
                message: `Team ${row.name} deleted successfully`,
                type: "success",
              });
              setRefreshTrigger((prev) => prev + 1);
            } catch (err) {
              showToast({
                message: err.message || "Failed to delete team",
                type: "error",
              });
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
      // Build payroll object conditionally
      const payroll = {
        id: selectedRow?.payroll?.id,
        paymentSchedule: data.paymentSchedule || "",
        ratePerHour: data.ratePerHour ? String(data.ratePerHour) : "",
        // Only include minimumHours if it's Salaried AND has a value
        ...(data.paymentSchedule === "SALARIED" &&
        data.minimumHours &&
        !isNaN(Number(data.minimumHours))
          ? { minimumHours: String(data.minimumHours) }
          : {}),
        otherPays: (data.otherPays || [])
          .filter((p) => p.type && p.type.trim() !== "")
          .map((p) => p.type),
        deductions: (data.deductions || [])
          .filter((d) => d.type && d.type.trim() !== "")
          .map((d) => d.type),
      };

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
        roleId: "2da05342-993a-414c-a660-c7382d2a823d",
        tenantId: modalMode === "add" ? tenantId : selectedRow?.tenantId,
        documents: data.documents
          .filter((f) => !f.error)
          .map((f) => ({
            id: f.id,
            documentsUrl: { filename: f.filename, url: f.url },
            tenantStaffId: selectedRow?.id,
          })),
        licenses: (data.licenses || [])
          .filter(
            (l) => l.licenseName && l.licenseNumber && l.expiryDate && l.state,
          )
          .map((l) => ({
            id: l.id,
            licenseName: l.licenseName,
            licenseNumber: l.licenseNumber,
            issueState: l.state,
            expiryDate: new Date(l.expiryDate).toISOString(),
            tenantStaffId: selectedRow?.id,
          })),
        payroll,
      };

      // Debug: see exactly what is being sent
      console.log("FINAL PAYLOAD TO API:", JSON.stringify(payload, null, 2));

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
      showToast({
        message: err.message || "Failed to save staff",
        type: "error",
      });
      throw err; // Re-throw so modal stays open
    } finally {
      setLoading(false);
    }
  };
  const handleTeamSubmit = async (data) => {
    try {
      if (modalMode === "edit") {
        await api.UpdateTeam({
          id: data.id,
          name: data.teamName,
          teamLeadId: data.teamLead,
          members: data.teamMember,
          accessToken,
          refreshToken,
        });
      } else {
        await api.CreateTeam({
          name: data.teamName,
          tenantId,
          teamLeadId: data.teamLead,
          members: data.teamMember,
          accessToken,
          refreshToken,
        });
      }
      setIsAddModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      showToast({
        message: `Team ${modalMode === "edit" ? "updated" : "created"} successfully`,
        type: "success",
      });
    } catch (err) {
      showToast({
        message: err.message || "Failed to save team",
        type: "error",
      });
      throw err;
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
    [view],
  );

  return (
    <>
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
          loading={view === "staff" ? loading : teamsLoading}
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
            key={`${modalMode}-${selectedRow?.id || "new"}`}
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleTeamSubmit}
            mode={modalMode}
            initialData={selectedRow}
            memberOptions={memberOptions}
            teamLeadOptions={teamLeadOptions}
          />
        )}
      </div>
    </>
  );
};

export default React.memo(StaffsAndTeams);
