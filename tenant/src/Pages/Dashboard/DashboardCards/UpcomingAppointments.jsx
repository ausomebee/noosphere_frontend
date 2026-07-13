// src/components/Dashboard/UpcomingAppointments.jsx (or wherever it lives)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Button from "../../../Components/Button/Button";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/AppointmentApi";
import useAuth from "../../../hooks/useAuth";
import expandForAppointments from "../../../utils/expandForAppointments";
import "../Dashboard.css";

const ITEMS_PER_PAGE = 5;

const UpcomingAppointments = ({ hasData, setCount }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // FIXED: Transform appointmentServices → service array
  const toTableRow = (apiAppt) => {
    const service = (apiAppt.appointmentServices || []).map((as) => {
      const modifier = as.modifiers?.modifier
        ? ` (${as.modifiers.modifier})`
        : "";

      // Known serviceCodeId → code mapping
      const knownCodes = {
        "4e304a36-8fe8-41fd-85f1-0398a25a50dd": "97158",
        // Add more mappings as needed
      };

      const code = knownCodes[as.serviceCodeId] || "Unknown";

      return {
        serviceType: `${code}${modifier}`,
        modifierType: as.modifiers?.modifier || "",
      };
    });

    return {
      ...apiAppt,
      service: service.length > 0 ? service : [],
      client: apiAppt.client || { firstName: "", lastName: "" },
      clinicians: apiAppt.clinicians || [],
      session: apiAppt.session || { name: "Unknown" },
      colourCode: apiAppt.colourCode || "#3B82F6",
    };
  };

  // Fetch upcoming appointments (tenant-wide only)
  const fetchAppointments = useCallback(async () => {
    if (!tenantId || !hasData) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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
          return total + instances.length;
        }, 0);
        setCount(totalInstances);
      }
    } catch (err) {
      console.error("Failed to load upcoming appointments:", err);
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


  const loadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

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
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
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
        <Button
          label="Schedule Appointment"
          variant="primary"
          onClick={() => (window.location.href = "/schedule-appointment")}
        />
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

      {/* Uncomment when you want "Load more" */}
      {/* {hasMore && (
        <div className="text-center mt-4">
          <Button
            label="Load more"
            variant="ghost"
            onClick={loadMore}
            className="text-sm"
          />
        </div>
      )} */}
    </div>
  );
};

export default UpcomingAppointments;
