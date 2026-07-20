import React, { useEffect, useMemo, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import usePermissions from "../../../hooks/usePermissions";
import CustomTable from "../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import api from "../../../api/billingAndPaymentsApi";
import { formatDate } from "../../../Helper/Formatters";
import useFormatSettings from "../../../hooks/useFormatSettings";
import AccessDenied from "../../../Components/AccessDenied/AccessDenied";

const TimeSheet = () => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { dateFormat } = useFormatSettings();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      if (!tenantId || !accessToken || !refreshToken) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.GetTimeSheetByTenantId({
          tenantId,
          accessToken,
          refreshToken, // assuming same token for refresh
        });

        // Sort by date descending (newest first)
        const sessions = Array.isArray(data) ? data : data?.data ?? [];
        const sortedData = sessions.sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );

        setSessions(sortedData);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to load timesheets");
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [tenantId, accessToken, refreshToken]);

  // Format hours to 2 decimal places
  const formatHours = (hours) => {
    if (!hours || hours === 0) return "0";
    return Number(hours).toFixed(2).replace(/\.00$/, "");
  };

  // Map API data to table format
  const tableData = useMemo(() => {
    return sessions.map((session) => ({
      id: session.id,
      dateTime: formatDate(session.date, dateFormat),
      therapist: session.clinician,
      clientName: session.clientName,
      hours: formatHours(session.totalHours),
      sessionType: session.sessionTypeName,
      clientStatusText: session.clientApprovalStatus || "PENDING",
      internalStatusText: session.supervisorApprovalStatus || "PENDING",
      hasActions: true,
      rawData: session, // optional: keep original if needed later
    }));
  }, [sessions]);

  const columns = useMemo(
    () => [
      { header: "Date", key: "dateTime", type: "date" },
      { header: "Clinician(s)", key: "therapist", type: "text" },
      { header: "Client Name", key: "clientName", type: "text" },
      { header: "Total Hour(s)", key: "hours", type: "text" },
      { header: "Session Type", key: "sessionType", type: "text" },
      {
        header: "Client Status",
        key: "clientStatusText",
        type: "statusText",
      },
      {
        header: "Internal Status",
        key: "internalStatusText",
        type: "statusText",
      },
    ],
    [],
  );

  const actions = useMemo(
    () => [
      {
        type: "dropdown",
        label: "More",
        items: [
          hasPermission("view_timesheet_details") && {
            label: "View",
            onClick: (row) => {
              navigate(`/billing/timesheets/${row.id}`);
            },
          },
          hasPermission("nudge_client_for_approval") && {
            label: "Nudge client for approval",
            onClick: (row) => {
              alert(`Nudge sent for session with ${row.clientName}`);
            },
          },
        ].filter(Boolean),
        className: "more-dropdown",
      },
    ],
    [navigate, hasPermission],
  );

  const filters = useMemo(
    () => [
      { value: "dateTime", label: "Date" },
      { value: "therapist", label: "Clinician" },
      { value: "clientName", label: "Client Name" },
      { value: "sessionType", label: "Session Type" },
      { value: "clientStatusText", label: "Client Approval" },
      { value: "internalStatusText", label: "Internal Approval" },
    ],
    [],
  );

  if (!hasPermission("view_timesheets_list")) return <AccessDenied />;

  return (
    <>
      <div>
        <h1 className="appointment-sched-title">Timesheets</h1>
        <h3 className="text-base text-gray-700 font-500">
          Manage and track your hours and service delivery
        </h3>
      </div>

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          tableName="Timesheets"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          loading={loading}
        />
      </div>
    </>
  );
};

export default TimeSheet;
