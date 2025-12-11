import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import DashboardLayout from "../../../Layout/TenantLayout";
import CustomTable from "../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import api from "../../../api/billingAndPaymentsApi"; // assuming this exports the function

const TimeSheet = () => {
  const { token, tenantId } = useSelector((s) => s.authentication?.user || {});
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      if (!tenantId || !token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.GetTimeSheetByTenantId({
          tenantId,
          accessToken: token,
          refreshToken: token, // assuming same token for refresh
        });

        // Sort by date descending (newest first)
        const sortedData = data.data.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
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
  }, [tenantId, token]);

  // Format date to MM/DD/YYYY or your preferred format
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format hours to 2 decimal places
  const formatHours = (hours) => {
    if (!hours || hours === 0) return "0";
    return Number(hours).toFixed(2).replace(/\.00$/, "");
  };

  // Map API data to table format
  const tableData = useMemo(() => {
    return sessions.map((session) => ({
      id: session.id,
      dateTime: formatDate(session.date),
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
    []
  );

  const actions = useMemo(
    () => [
      {
        type: "dropdown",
        label: "More",
        items: [
          {
            label: "View",
            onClick: (row) => {
              navigate(`/billing/timesheets/${row.id}`);
            },
          },
          {
            label: "Nudge client for approval",
            onClick: (row) => {
              // You can trigger a nudge API here
              alert(`Nudge sent for session with ${row.clientName}`);
            },
          },
        ],
        className: "more-dropdown",
      },
    ],
    [navigate]
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
    []
  );

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Timesheets</h1>
        <h3 className="text-xl text-gray-700 font-500">
          Manage and track your hours and service delivery
        </h3>
      </div>

      <div className="mt-32">
      
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
    </DashboardLayout>
  );
};

export default TimeSheet;
