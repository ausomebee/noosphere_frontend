import React, { useEffect, useMemo, useState, useCallback } from "react";
import Button from "../../../Components/Button/Button";
import CustomTable from "../../../Components/Table/CustomTable";
import api from "../../../api/AppointmentApi";
import { useSelector } from "react-redux";
import expandForAppointments from "../../../utils/expandForAppointments";
import "../Dashboard.css";

const ITEMS_PER_PAGE = 5;

const UpcomingAppointments = ({ hasData, setCount }) => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const accessToken = useSelector((s) => s.authentication?.user?.token);
  const refreshToken = accessToken;

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

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

      const data = response?.data?.data || [];
      setMasters(data);

      // Send total count to parent (for badge)
      if (setCount) {
        const totalInstances = data.reduce((total, master) => {
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
  }, [tenantId, accessToken, refreshToken, hasData, setCount]);

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

  const hasMore = paginatedData.length < allAppointments.length;

  const loadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  // Format for CustomTable
  const tableData = paginatedData.map((appt) => ({
    clientName: `${appt.client?.firstName || ""} ${appt.client?.lastName || ""}`.trim() || "Unknown",
    therapistName: appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned",
    serviceType: appt.service?.map((s) => s.serviceType).join(", ") || "N/A",
    sessionType: appt.session?.name || "N/A",
    date: appt.date || "—",
    time: appt.startTime && appt.endTime ? `${appt.startTime} - ${appt.endTime}` : "—",
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
    return <div className="text-center py-8 text-gray-500">Loading appointments...</div>;
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