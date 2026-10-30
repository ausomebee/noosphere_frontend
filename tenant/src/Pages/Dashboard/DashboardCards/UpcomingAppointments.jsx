// src/components/Dashboard/UpcomingAppointments.jsx (or wherever it lives)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Button from "../../../Components/Button/Button";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/AppointmentApi";
import useAuth from "../../../hooks/useAuth";
import usePermissions from "../../../hooks/usePermissions";
import expandForAppointments from "../../../utils/expandForAppointments";
import { toServiceRows } from "../../../utils/appointmentDisplay";
import DashboardEmptyState from "./DashboardEmptyState";
import "../Dashboard.css";

const ITEMS_PER_PAGE = 5;

const UpcomingAppointments = ({ hasData, setCount }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage] = useState(1);

  // Transform appointmentServices → service array
  const toTableRow = (apiAppt) => ({
    ...apiAppt,
    service: toServiceRows(apiAppt.appointmentServices),
    client: apiAppt.client || { firstName: "", lastName: "" },
    clinicians: apiAppt.clinicians || [],
    session: apiAppt.session || { name: "Unknown" },
    colourCode: apiAppt.colourCode || "#3B82F6",
  });

  // Fetch upcoming appointments (tenant-wide only)
  const fetchAppointments = useCallback(async () => {
    if (!tenantId || !hasData) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);
      const response = await api.GetUpcomingAppointmentByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const rawData = response?.data?.data || [];
      const transformed = rawData.map(toTableRow);
      setMasters(transformed);

      // Send total count to parent (for badge)
      if (setCount) {
        const totalInstances = transformed.reduce((total, master) => {
          const instances = expandForAppointments(master, "future");
          return total + (Number(instances.length) || 0);
        }, 0);
        setCount(Number(totalInstances) || 0);
      }
    } catch (err) {
      console.error("Failed to load upcoming appointments:", err);
      setError(true);
      setMasters([]);
      if (setCount) setCount(0);
    } finally {
      setLoading(false);
    }
    // Token lifecycle is owned by the axios interceptor; depending on it here
    // causes an infinite refetch loop when a 401 triggers a token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, hasData, setCount]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Expand all recurring + non-recurring appointments
  const allAppointments = useMemo(() => {
    if (masters.length === 0) return [];

    const expanded = [];
    masters.forEach((master) => {
      const instances = expandForAppointments(master, "future");
      expanded.push(...instances);
    });

    return expanded.sort((a, b) => {
      const dateA = new Date(a.date + "T" + a.startTime);
      const dateB = new Date(b.date + "T" + b.startTime);
      return dateA - dateB;
    });
  }, [masters]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = 0;
    const end = currentPage * ITEMS_PER_PAGE;
    return allAppointments.slice(start, end);
  }, [allAppointments, currentPage]);


  // Format for CustomTable
  const tableData = paginatedData.map((appt) => ({
    clientName:
      `${appt.client?.firstName || ""} ${appt.client?.lastName || ""}`.trim() ||
      "Unknown",
    therapistName:
      appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned",
    serviceType: appt.service?.map((s) => s.serviceType).join(", ") || "N/A",
    sessionType: appt.session?.name || "N/A",
    date: appt.date || "—",
    time:
      appt.startTime && appt.endTime
        ? `${appt.startTime} - ${appt.endTime}`
        : "—",
  }));

  const columns = [
    { header: "Client", key: "clientName", type: "text" },
    { header: "Clinician(s)", key: "therapistName", type: "text", width: "clamp(150px, 16vw, 260px)" },
    { header: "Service Type(s)", key: "serviceType", type: "text", width: "clamp(150px, 16vw, 260px)" },
    { header: "Session Type", key: "sessionType", type: "text", width: "clamp(130px, 13vw, 220px)" },
    { header: "Date", key: "date", type: "text" },
    { header: "Time", key: "time", type: "text" },
  ];

  if (!hasData) {
    return (
      <div className="text-center p-6">
        <p className="text-muted text-lg mb-4">No upcoming appointments</p>
        <p className="text-muted mb-6">
          Schedule your first appointment to see it here
        </p>
        {hasPermission("create_a_new_appointment") && (
          <Button
            label="Schedule Appointment"
            variant="primary"
            onClick={() => (window.location.href = "/schedule-appointment")}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading appointments...
      </div>
    );
  }

  if (error) {
    return (
      <DashboardEmptyState description="We couldn't load your upcoming appointments. Please try again.">
        <Button
          label="Try again"
          variant="primary"
          className="mx-auto block"
          onClick={fetchAppointments}
        />
      </DashboardEmptyState>
    );
  }

  if (allAppointments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No upcoming appointments scheduled
      </div>
    );
  }

  return (
    <div className="upcoming-appointments-card">
      <CustomTable
        data={tableData}
        columns={columns}
        loading={loading}
        itemsPerPage={ITEMS_PER_PAGE}
        showActions={false}
        showCheckbox={false}
        showFilters={false}
        showSearch={false}
        hideSearch={true}
        tableName=""
      />

      {/* A "Load more" button is parked here. Its handler and the
          setCurrentPage it drove were removed with the rest of the unused
          code; recover them from git history when paging is re-enabled. */}
    </div>
  );
};

export default UpcomingAppointments;
