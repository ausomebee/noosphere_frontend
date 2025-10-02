import { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  addDays,
  format
} from "date-fns";
import DashboardLayout from "../../../Layout/TenantLayout";
import CalendarScheduler from "../../../Components/CalendarScheduler/CalendarScheduler";
import api from "../../../api/AppointmentApi";
import expand from "../../../utils/expand";

const toUICard = (apiAppt, masters = []) => {
  if (!apiAppt || typeof apiAppt !== "object") {
    console.error("Invalid apiAppt provided to toUICard");
    return null;
  }

  const normalizeTime = (time) => {
    if (!time) return "";
    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      console.warn(`Invalid time format: ${time}, returning empty string`);
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
      console.warn(`Invalid recurrence type: ${recurrence.type}, defaulting to ${normalized.type}`);
    }
    return normalized;
  };

  const masterAppt = apiAppt.isRecurringInstance && apiAppt.parentId
    ? masters.find(m => m.id === apiAppt.parentId) ?? apiAppt
    : apiAppt;

  const cliniciansRaw = apiAppt.clinicians || [];
  const clinicians = cliniciansRaw.map((c) => {
    if (typeof c === "object" && c.id) return c;
    const matched = apiAppt.staff?.find((s) => s.id === c);
    if (!matched) {
      console.warn(`No staff data found for clinician ID: ${c}`);
    }
    return matched ? { id: matched.id, fullName: matched.fullName } : { id: c, fullName: "Unknown Clinician" };
  });

  if (!apiAppt.client?.fullName) {
    console.debug(`Missing client fullName for appointment ID: ${apiAppt.id}`);
  }

  return {
    id: apiAppt.id,
    client: apiAppt.clientId,
    clientId: apiAppt.clientId,
    clientName: apiAppt.client?.fullName || "Unknown Client",
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

const Calendar = ({ selectedClients = [], onFetchClientAppointments }) => {
  const tenantId = useSelector((s) => s.authentication?.user?.tenantId);
  const role = useSelector(
    (s) => s.authentication?.user?.role?.name ?? "Client"
  );
  const userId = useSelector((s) => s.authentication?.user?.id);
  const token = useSelector((s) => s.authentication?.user?.token);
  const accessToken = token;
  const refreshToken = token;

  const [sessionTypes, setSessionTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);

const fetchInitialData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let appointmentP;
      if (role === "Admin") {
        appointmentP = api
          .GetAppointmentByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data.data)
          .catch(() => []);
      } else if (role === "Staff") {
        appointmentP = api
          .GetAppointmentByStaffId({
            staffId: userId,
            accessToken,
            refreshToken,
          })
          .then((r) => r.data.data)
          .catch(() => []);
      } else {
        appointmentP = api
          .GetAppointmentByClientId({
            clientId: userId,
            accessToken,
            refreshToken,
          })
          .then((r) => r.data.data)
          .catch(() => []);
      }

      const sessionP = api
        .GetSessionTypeActiveByTenantId({ tenantId, accessToken, refreshToken })
        .then((r) => r.data.data)
        .catch(() => []);

      const clientP = api
        .GetClientByTenantId({ tenantId, accessToken, refreshToken })
        .then((r) => r.data.data)
        .catch(() => []);

      const staffP = api
        .GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken })
        .then((r) => r.data.data)
        .catch(() => []);

      const [sess, clis, stf, appts] = await Promise.all([
        sessionP,
        clientP,
        staffP,
        appointmentP,
      ]);

      const enrichedAppts = appts.map((appt) => ({
        ...appt,
        tenant: appt.tenant || null,
        client: appt.client || null,
        staff: stf,
        session: sess.find((s) => s.id === appt.sessionId) || null,
        sessionId: appt.sessionId,
      }));

      setSessionTypes(sess);
      setClients(clis);
      setStaff(stf);
      setMasters(enrichedAppts.map((appt) => toUICard(appt, enrichedAppts))); // Pass enrichedAppts
    } catch (error) {

    } finally {
      setLoading(false);
    }
  }, [tenantId, role, userId, accessToken, refreshToken]);

  const fetchClientAppointments = useCallback(
    async (clientIds) => {
      if (!tenantId || !clientIds.length) return;

      setLoading(true);
      try {
        const appointmentP = Promise.all(
          clientIds.map((clientId) =>
            api
              .GetAppointmentByClientId({ clientId, accessToken, refreshToken })
              .then((r) => r.data.data)
              .catch(() => [])
          )
        ).then((results) => results.flat());

        const [appts] = await Promise.all([appointmentP]);

        const enrichedAppts = appts.map((appt) => ({
          ...appt,
          tenant: appt.tenant || null,
          client: appt.client || null,
          staff,
          session: sessionTypes.find((s) => s.id === appt.sessionId) || null,
          sessionId: appt.sessionId,
        }));

        setMasters(enrichedAppts.map((appt) => toUICard(appt, enrichedAppts))); // Pass enrichedAppts
      } catch (error) {

      } finally {
        setLoading(false);
      }
    },
    [tenantId, accessToken, refreshToken, staff, sessionTypes]
  );

  useEffect(() => {
    if (onFetchClientAppointments) {
      onFetchClientAppointments(fetchClientAppointments);
    }
  }, [onFetchClientAppointments, fetchClientAppointments]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (isMounted) {
        await fetchInitialData();
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [fetchInitialData]);

  const viewWindow = useMemo(() => {
    const today = new Date();
    return { start: addDays(today, -30), end: addDays(today, 180) };
  }, []);

  const appointments = useMemo(() => {
  if (!masters.length) return [];
  const flat = [];
  masters.forEach((m) => {
    const expanded = expand(m, viewWindow);
    flat.push(...expanded);
  });
  return flat;
}, [masters, viewWindow]);
  

  return (
    <DashboardLayout>
      <CalendarScheduler
        staff={staff}
        clients={clients}
        sessionTypes={sessionTypes}
        appointments={appointments}
        initialDate={new Date()}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
        role={role}
        selectedClients={selectedClients}
        refreshAppointments={fetchInitialData}
        loading={loading}
      />
    </DashboardLayout>
  );
};

export default Calendar;