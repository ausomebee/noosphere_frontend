// Calendar.jsx — FINAL: REAL COUNTS ON LOAD, APPOINTMENTS ONLY ON FILTER
import { useState, useMemo, useEffect, useCallback } from "react";
import useAuth from "../../../hooks/useAuth";
import { addDays } from "date-fns";

import CalendarScheduler from "../../../Components/CalendarScheduler/CalendarScheduler";
import expand from "../../../utils/expand";
import { format } from "date-fns";
import api from "../../../api/AppointmentApi";
import usePermissions from "../../../hooks/usePermissions";
import { showToast } from "../../../Helper/ShowToast";

const toUICard = (apiAppt, masters = []) => {
  if (!apiAppt || typeof apiAppt !== "object") {
    console.error("Invalid apiAppt provided to toUICard");
    return null;
  }

  const normalizeTime = (time) => {
    if (!time) return "";
    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return "";
    const [_, hours, minutes] = match;
    return `${hours.padStart(2, "0")}:${minutes}`;
  };

  const normalizeRecurrence = (recurrence) => {
    if (!recurrence || Object.keys(recurrence).length === 0) return null;
    const validTypes = ["day", "week", "month", "custom"];
    const validUnits = ["day", "week", "month"];
    const validPositions = ["on", "first", "second", "third", "fourth", "last"];
    const validWeekdays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    return {
      type: validTypes.includes(recurrence.type) ? recurrence.type : "day",
      interval:
        Number.isInteger(recurrence.interval) && recurrence.interval > 0
          ? recurrence.interval
          : 1,
      unit: validUnits.includes(recurrence.unit) ? recurrence.unit : "day",
      days: Array.isArray(recurrence.days) ? recurrence.days : [],
      day: Array.isArray(recurrence.day) ? recurrence.day : [],
      position: validPositions.includes(recurrence.position)
        ? recurrence.position
        : "on",
      weekday: validWeekdays.includes(recurrence.weekday)
        ? recurrence.weekday
        : "",
      endType: ["never", "on", "after"].includes(recurrence.endType)
        ? recurrence.endType
        : "never",
      endOn: recurrence.endOn || "",
      occurrences:
        Number.isInteger(recurrence.occurrences) && recurrence.occurrences > 0
          ? recurrence.occurrences
          : 1,
    };
  };

  const isInstance = apiAppt.isRecurringInstance && apiAppt.parentId;
  const masterAppt = isInstance
    ? masters.find((m) => m.id === apiAppt.parentId) || apiAppt
    : apiAppt;

  const clinicians = (apiAppt.clinicians || []).map((c) => ({
    id: c.id,
    fullName: c.fullName || "Unknown Clinician",
  }));

  const service = (apiAppt.appointmentServices || []).map((as) => {
    const code = as.serviceCode || {};
    return {
      serviceCodeId: code.id || "",
      serviceType: code.code ? `${code.code}` : "Not specified",
      modifierType: code.modifiers?.modifier1 || "",
    };
  });

  if (service.length === 0) {
    service.push({ serviceType: "Not specified", modifierType: "" });
  }

  const clientName = apiAppt.client
    ? `${apiAppt.client.firstName || ""} ${
        apiAppt.client.lastName || ""
      }`.trim() || "Unknown Client"
    : "Unknown Client";

  return {
    id: apiAppt.id,
    clientId: apiAppt.clientId,
    clientName,
    clinicians,
    clinicianNames: clinicians.map((c) => c.fullName),
    clinicianIds: clinicians.map((c) => c.id?.toString()).filter(Boolean),
    service,
    sessionType: apiAppt.session?.id || apiAppt.sessionId || "",
    sessionName: apiAppt.session?.name || "Unknown Session",
    date: apiAppt.date ? format(new Date(apiAppt.date), "yyyy-MM-dd") : "",
    startTime: normalizeTime(apiAppt.startTime),
    endTime: normalizeTime(apiAppt.endTime),
    colorCode: apiAppt.colourCode || "#FF5733",
    serviceLocation: apiAppt.serviceLocation || "",
    isRecurring: masterAppt.isRecurring || false,
    recurrence: normalizeRecurrence(masterAppt.recurrence),
    billable: apiAppt.isBillable ?? true,
    requiresTravel: apiAppt.requiresTravel ?? false,
    isCanceled: apiAppt.isCanceled || false,
    relatedAppointments: apiAppt.relatedAppointments || [],
    rescheduled: apiAppt.rescheduled || false,
    rescheduleAccepted: apiAppt.rescheduleAccepted || false,
    parentId: apiAppt.parentId || null,
    isRecurringInstance: apiAppt.isRecurringInstance || false,
  };
};

const Calendar = () => {
  const { tenantId, userId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewStaff = hasPermission("view_staff_list");
  const canViewClients = hasPermission("view_client_list");
  const canFilter = canViewStaff || canViewClients;

  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);

  const [staffWithCounts, setStaffWithCounts] = useState([]);
  const [clientsWithCounts, setClientsWithCounts] = useState([]);

  useEffect(() => {
    window.CALENDAR_DEBUG = {
      staffWithCounts,
      clientsWithCounts,
      filteredAppointments: filteredAppointments.length,
    };
  }, [staffWithCounts, clientsWithCounts, filteredAppointments]);

  const fetchInitialData = useCallback(async () => {
    if (!tenantId || !accessToken) {
      setLoading(false);
      return;
    }

    setFetchError(null);
    
    try {
      // Get session types
      let sess = [];
      try {
        const sessResponse = await api.GetSessionTypeActiveByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
        sess = sessResponse?.data?.data || [];
      } catch (err) {
        console.error("Failed to fetch session types:", err);
      }
      setSessionTypes(sess);

      // Get clients
      let clis = [];
      try {
        const clisResponse = await api.GetClientByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
        clis = clisResponse?.data?.data || [];
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      }
      // Get staff
      let stf = [];
      try {
        const stfResponse = await api.GetTenantStaffByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
        stf = stfResponse?.data?.data || [];
      } catch (err) {
        console.error("Failed to fetch staff:", err);
      }
      setStaff(stf);




      
      // All roles fetch all appointments; filter visibility is controlled by permissions
      let allAppts = [];
      try {
        const apptsResponse = await api.GetAllAppointments({
          tenantId,
          accessToken,
          refreshToken,
        });
        allAppts = apptsResponse?.data?.data || [];
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      }

      const enriched = allAppts.map(appt => ({
        ...appt,
        session: sess.find(s => s.id === appt.sessionId) || null,
      }));

      const uiAppointments = enriched
        .map((appt) => toUICard(appt, enriched))
        .filter(Boolean);
      
      setAllAppointments(uiAppointments);

      const viewWindow = {
        start: addDays(new Date(), -30),
        end: addDays(new Date(), 180),
      };
      
      const expanded = uiAppointments.flatMap((master) =>
        expand(master, viewWindow)
      );

      const counts = expanded.reduce(
        (acc, appt) => {
          if (appt.clientId)
            acc.clients[appt.clientId] = (acc.clients[appt.clientId] || 0) + 1;
          if (Array.isArray(appt.clinicianIds)) {
            appt.clinicianIds.forEach((id) => {
              if (id) acc.staff[id] = (acc.staff[id] || 0) + 1;
            });
          }
          return acc;
        },
        { staff: {}, clients: {} }
      );

      setStaffWithCounts(
        stf.map((s) => ({ 
          ...s, 
          appointmentCount: counts.staff[s.id?.toString()] || 0,
          fullName: `${s.fullName || ""}` || "Unknown Staff"
        }))
      );

      setClientsWithCounts(
        clis.map((c) => ({
          ...c,
          appointmentCount: counts.clients[c.clientId] || 0,
          fullName:
            `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
            "Unknown Client",
        }))
      );
      
    } catch (err) {
      console.error("Calendar initialization error:", err);
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchAppointmentsByFilter = useCallback(
    ({ clientIds = [], staffIds = [] }) => {
      try {
        if ((!clientIds || clientIds.length === 0) && (!staffIds || staffIds.length === 0)) {
          setFilteredAppointments([]);
          return;
        }

        if (!allAppointments || !Array.isArray(allAppointments)) {
          setFilteredAppointments([]);
          return;
        }

        const filtered = allAppointments.filter((appt) => {
          if (!appt) return false;
          
          const matchesClient =
            !clientIds || clientIds.length === 0 || 
            (appt.clientId && clientIds.includes(appt.clientId));
            
          const matchesStaff =
            !staffIds || staffIds.length === 0 ||
            (Array.isArray(appt.clinicianIds) && 
             appt.clinicianIds.some((id) => staffIds.includes(id)));
             
          return matchesClient && matchesStaff;
        });

        setFilteredAppointments(filtered);
      } catch (err) {
        console.error("Error filtering appointments:", err);
        setFilteredAppointments([]);
      }
    },
    [allAppointments]
  );

  useEffect(() => {
    if (!userId || allAppointments.length === 0) return;

    // Users without filter access are auto-filtered to their own appointments as staff.
    if (!canFilter) {
      const idStr = userId.toString();
      setSelectedStaff([idStr]);
      fetchAppointmentsByFilter({ staffIds: [idStr] });
    }
  }, [canFilter, userId, allAppointments.length, fetchAppointmentsByFilter]);

  const viewWindow = useMemo(
    () => ({
      start: addDays(new Date(), -30),
      end: addDays(new Date(), 180),
    }),
    []
  );

  const expandedAppointments = useMemo(() => {
    if (!filteredAppointments || !Array.isArray(filteredAppointments)) {
      return [];
    }
    try {
      return filteredAppointments.flatMap((master) => {
        if (!master) return [];
        return expand(master, viewWindow);
      });
    } catch (err) {
      console.error("Error expanding appointments:", err);
      return [];
    }
  }, [filteredAppointments, viewWindow]);

  if (fetchError) {
    return (
      <>
        <div style={{ padding: "20px", color: "red" }}>
          Error loading calendar: {fetchError}
        </div>
      </>
    );
  }

  return (
    <>
      <CalendarScheduler
        staff={staffWithCounts}
        clients={clientsWithCounts}
        sessionTypes={sessionTypes}
        appointments={expandedAppointments}
        initialDate={new Date()}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
        selectedClients={selectedClients}
        selectedStaff={selectedStaff}
        setSelectedClients={setSelectedClients}
        setSelectedStaff={setSelectedStaff}
        fetchAppointmentsByFilter={fetchAppointmentsByFilter}
        loading={loading}
      />
    </>
  );
};

export default Calendar;