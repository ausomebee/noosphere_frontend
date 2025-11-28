// Calendar.jsx — FINAL: REAL COUNTS ON LOAD, APPOINTMENTS ONLY ON FILTER
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { addDays } from "date-fns";
import DashboardLayout from "../../../Layout/TenantLayout";
import CalendarScheduler from "../../../Components/CalendarScheduler/CalendarScheduler";
import expand from "../../../utils/expand";
import { format } from "date-fns";
import api from "../../../api/AppointmentApi"
const toUICard = (apiAppt, masters = []) => {
  if (!apiAppt || typeof apiAppt !== "object") {
    console.error("Invalid apiAppt provided to toUICard");
    return null;
  }

  const normalizeTime = (time) => {
    if (!time) return "";
    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      return "";
    }
    const [_, hours, minutes] = match;
    return `${hours.padStart(2, "0")}:${minutes}`;
  };

  const normalizeRecurrence = (recurrence) => {
    if (!recurrence) return null;
    const validTypes = ["day", "week", "month", "custom"];
    const validUnits = ["day", "week", "month"];
    const validPositions = ["on", "first", "second", "third", "fourth", "last"];
    const validWeekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const normalized = {
      type: validTypes.includes(recurrence.type) ? recurrence.type : "day",
      interval: Number.isInteger(recurrence.interval) && recurrence.interval > 0 ? recurrence.interval : 1,
      unit: validUnits.includes(recurrence.unit) ? recurrence.unit : "day",
      days: Array.isArray(recurrence.days) ? recurrence.days : [],
      day: Array.isArray(recurrence.day) ? recurrence.day : [],
      position: validPositions.includes(recurrence.position) ? recurrence.position : "on",
      weekday: validWeekdays.includes(recurrence.weekday) ? recurrence.weekday : "",
      endType: ["never", "on", "after"].includes(recurrence.endType) ? recurrence.endType : "never",
      endOn: recurrence.endOn || "",
      occurrences: Number.isInteger(recurrence.occurrences) && recurrence.occurrences > 0 ? recurrence.occurrences : 1,
    };
    if (normalized.type !== recurrence.type) {
    }
    return normalized;
  };

  const masterAppt = apiAppt.isRecurringInstance && apiAppt.parentId
    ? masters.find(m => m.id === apiAppt.parentId) ?? apiAppt
    : apiAppt;

  const cliniciansRaw = apiAppt.clinicians || [];
  const clinicians = cliniciansRaw.map((c) => {
    if (typeof c === "object" && c.id) {
      // Updated clinician name construction
      const clinicianName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown Clinician";
      return { ...c, fullName: clinicianName };
    }
    const matched = apiAppt.staff?.find((s) => s.id === c);
    if (!matched) {
      return { id: c, fullName: "Unknown Clinician" };
    }
    // Updated matched clinician name construction
    const matchedName = `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || "Unknown Clinician";
    return { ...matched, fullName: matchedName };
  });

  if (!apiAppt.client?.firstName && !apiAppt.client?.lastName) {
  }

  return {
    id: apiAppt.id,
    client: apiAppt.clientId,
    clientId: apiAppt.clientId,
    clientName: `${apiAppt.client?.firstName || ''} ${apiAppt.client?.lastName || ''}`.trim() || "Unknown Client",
    tenantName: apiAppt.tenant?.companyName || "Unknown Tenant",
    clinicians,
    clinicianNames: clinicians.map((c) => c.fullName || "Unknown Clinician"),
    clinicianIds: clinicians.map((c) => c.id.toString()),
    service: apiAppt.service && apiAppt.service.length > 0
      ? apiAppt.service.map((svc) => ({
          serviceType: svc.serviceType || "",
          modifierType: svc.modifierType || "",
        }))
      : [{ serviceType: "", modifierType: "" }],
    sessionType: apiAppt.sessionId || apiAppt.session?.id || "",
    sessionName: apiAppt.session?.name || "Unknown Session",
    date: apiAppt.date ? format(new Date(apiAppt.date), "yyyy-MM-dd") : "",
    startTime: normalizeTime(apiAppt.startTime),
    endTime: normalizeTime(apiAppt.endTime),
    colorCode: apiAppt.colourCode || "#000000",
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
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector((s) => s.authentication?.user?.role?.name ?? "Client");
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  const [sessionTypes, setSessionTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]); // For counts only
  const [filteredAppointments, setFilteredAppointments] = useState([]); // For calendar
  const [loading, setLoading] = useState(true);

  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);

  const [staffWithCounts, setStaffWithCounts] = useState([]);
  const [clientsWithCounts, setClientsWithCounts] = useState([]);

  // DEBUG
  useEffect(() => {
    window.CALENDAR_DEBUG = { staffWithCounts, clientsWithCounts, filteredAppointments: filteredAppointments.length };
  }, [staffWithCounts, clientsWithCounts, filteredAppointments]);

  // FETCH ALL DATA + COUNTS ON LOAD
  const fetchInitialData = useCallback(async () => {
    if (!tenantId || !accessToken) return;

    try {
      const [sess, clis, stf, allAppts] = await Promise.all([
        api.GetSessionTypeActiveByTenantId({ tenantId, accessToken, refreshToken }).then(r => r.data.data || []),
        api.GetClientByTenantId({ tenantId, accessToken, refreshToken }).then(r => r.data.data || []),
        api.GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken }).then(r => r.data.data || []),
        role === "Admin"
          ? api.GetAllAppointments({ tenantId, accessToken, refreshToken }).then(r => r.data.data || [])
          : api.GetAppointmentByClientId({ clientId: userId, accessToken, refreshToken }).then(r => r.data.data || [])
      ]);

      setSessionTypes(sess);
      setClients(clis);
      setStaff(stf);

      const enriched = allAppts.map(appt => ({
        ...appt,
        tenant: appt.tenant || null,
        client: appt.client || null,
        staff: stf,
        session: sess.find(s => s.id === appt.sessionId) || null,
      }));

      const uiAppointments = enriched.map(appt => toUICard(appt, enriched));
      setAllAppointments(uiAppointments);

      const viewWindow = { start: addDays(new Date(), -30), end: addDays(new Date(), 180) };
      const expanded = uiAppointments.flatMap(master => expand(master, viewWindow));

      const counts = expanded.reduce((acc, appt) => {
        if (appt.clientId) acc.clients[appt.clientId] = (acc.clients[appt.clientId] || 0) + 1;
        if (Array.isArray(appt.clinicianIds)) {
          appt.clinicianIds.forEach(id => acc.staff[id] = (acc.staff[id] || 0) + 1);
        }
        return acc;
      }, { staff: {}, clients: {} });

      // Update staff with firstName/lastName construction for display
          setStaffWithCounts(stf.map(s => ({ ...s, appointmentCount: counts.staff[s.id] || 0 })));


      // Update clients with firstName/lastName construction for display
      setClientsWithCounts(clis.map(c => ({ 
        ...c, 
        appointmentCount: counts.clients[c.clientId] || 0,
        fullName: `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown Client"
      })));

    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [tenantId, accessToken, refreshToken, role, userId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // FILTER APPOINTMENTS ONLY WHEN USER SELECTS
  const fetchAppointmentsByFilter = useCallback(({ clientIds = [], staffIds = [] }) => {
    if (clientIds.length === 0 && staffIds.length === 0) {
      setFilteredAppointments([]);
      return;
    }

    const filtered = allAppointments.filter(appt => {
      const matchesClient = clientIds.length === 0 || clientIds.includes(appt.clientId);
      const matchesStaff = staffIds.length === 0 || appt.clinicianIds.some(id => staffIds.includes(id));
      return matchesClient && matchesStaff;
    });

    setFilteredAppointments(filtered);
  }, [allAppointments]);

  // AUTO SELECT FOR CLIENT ROLE
  useEffect(() => {
    if (role === "Client" && userId && clients.length > 0) {
      setSelectedClients([userId]);
      fetchAppointmentsByFilter({ clientIds: [userId] });
    }
  }, [role, userId, clients.length, fetchAppointmentsByFilter]);

  const viewWindow = useMemo(() => ({
    start: addDays(new Date(), -30),
    end: addDays(new Date(), 180),
  }), []);

  const expandedAppointments = useMemo(() => {
    return filteredAppointments.flatMap(master => expand(master, viewWindow));
  }, [filteredAppointments, viewWindow]);

  return (
    <DashboardLayout>
      <CalendarScheduler
        staff={staffWithCounts}
        clients={clientsWithCounts}
        sessionTypes={sessionTypes}
        appointments={expandedAppointments}
        initialDate={new Date()}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
        role={role}
        selectedClients={selectedClients}
        selectedStaff={selectedStaff}
        setSelectedClients={setSelectedClients}
        setSelectedStaff={setSelectedStaff}
        fetchAppointmentsByFilter={fetchAppointmentsByFilter}
        loading={loading}
      />
    </DashboardLayout>
  );
};

export default Calendar;