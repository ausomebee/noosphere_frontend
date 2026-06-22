import React, { useState, useMemo, useEffect } from "react";

import UpcomingAppointments from "./AppointmentSubs/UpcomingAppointments";
import RescheduleRequests from "./AppointmentSubs/RescheduleRequests";
import PastAppointments from "./AppointmentSubs/PastAppointments";
import CancelledAppointments from "./AppointmentSubs/CancelledAppointments";
import usePermissions from "../../../hooks/usePermissions";
import useAuth from "../../../hooks/useAuth";
import api from "../../../api/AppointmentApi";

const ALL_TABS = [
  { key: "upcomingAppointments", label: "Upcoming Appointments", permissionKey: "view_upcoming_appointments" },
  { key: "rescheduleRequests", label: "Reschedule Requests", permissionKey: "view_reschedule_request" },
  { key: "pastAppointments", label: "Past Appointments", permissionKey: "view_past_appointments" },
  { key: "cancelledAppointments", label: "Cancelled Appointments", permissionKey: "view_canceled_appointments" },
];

const Appointments = () => {
  const { hasPermission } = usePermissions();
  const { tenantId, role: authRole, userId, accessToken, refreshToken } =
    useAuth();
  const role = authRole?.name ?? "Client";

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  const [view, setView] = useState(visibleTabs[0]?.key || "");
  // No seeded mock counts — badges derive from real data and stay hidden at 0.
  const [counts, setCounts] = useState({});

  // Fetch the real counts for every tab on mount (not just the active one) so
  // the badges are accurate immediately, regardless of which tab is open. Each
  // sub-component still owns live updates (cancel, approve, reject) via setCounts.
  useEffect(() => {
    if (!tenantId && !userId) return;
    let cancelled = false;
    const lengthOf = (res) => res?.data?.data?.length ?? 0;

    const fetchCounts = async () => {
      const upcomingP =
        role === "Admin"
          ? api.GetUpcomingAppointmentByTenantId({ tenantId, accessToken, refreshToken })
          : api.GetUpcomingAppointmentByStaffId({ staffId: userId, accessToken, refreshToken });

      const rescheduleP =
        role === "Staff"
          ? api.GetRescheduleAppointmentReqByStaffId({ staffId: userId, accessToken, refreshToken })
          : api.GetRescheduleAppointmentReqByTenantId({ tenantId, accessToken, refreshToken });

      const cancelledP =
        role === "Admin" || role === "Owner"
          ? api.GetCancelledAppointmentByTenantId({ tenantId, accessToken, refreshToken })
          : role === "Therapist" || role === "Clinician"
            ? api.GetCancelledAppointmentByStaffId({ staffId: userId, accessToken, refreshToken })
            : Promise.resolve(null);

      const [up, re, ca] = await Promise.allSettled([upcomingP, rescheduleP, cancelledP]);
      if (cancelled) return;

      setCounts((prev) => ({
        ...prev,
        upcomingAppointments: up.status === "fulfilled" ? lengthOf(up.value) : 0,
        rescheduleRequests: re.status === "fulfilled" ? lengthOf(re.value) : 0,
        cancelledAppointments:
          ca.status === "fulfilled" && ca.value ? lengthOf(ca.value) : 0,
      }));
    };

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [tenantId, userId, role, accessToken, refreshToken]);

  if (!visibleTabs.length) return null;

  return (
    <>
      <div>
        <h1 className="appointment-sched-title">Appointments</h1>
        <div>
          <div className="appointment-sched-view-switcher">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`appointment-sched-view-button flex items-center ${
                  view === tab.key
                    ? "appointment-sched-view-button-active"
                    : "appointment-sched-view-button-inactive"
                }`}
              >
                <span>{tab.label}</span>
                {counts[tab.key] > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="appointment-content">
          {view === "upcomingAppointments" && (
            <UpcomingAppointments counts={counts} setCounts={setCounts} />
          )}
          {view === "rescheduleRequests" && (
            <RescheduleRequests counts={counts} setCounts={setCounts} />
          )}
          {view === "pastAppointments" && (
            <PastAppointments counts={counts} setCounts={setCounts} />
          )}
          {view === "cancelledAppointments" && (
            <CancelledAppointments counts={counts} setCounts={setCounts} />
          )}
        </div>
      </div>
    </>
  );
};

export default Appointments;
