import React, { useState, useMemo } from "react";

import UpcomingAppointments from "./AppointmentSubs/UpcomingAppointments";
import RescheduleRequests from "./AppointmentSubs/RescheduleRequests";
import PastAppointments from "./AppointmentSubs/PastAppointments";
import CancelledAppointments from "./AppointmentSubs/CancelledAppointments";
import usePermissions from "../../../hooks/usePermissions";

const ALL_TABS = [
  { key: "upcomingAppointments", label: "Upcoming Appointments", permissionKey: "view_upcoming_appointments" },
  { key: "rescheduleRequests", label: "Reschedule Requests", permissionKey: "view_reschedule_request" },
  { key: "pastAppointments", label: "Past Appointments", permissionKey: "view_past_appointments" },
  { key: "cancelledAppointments", label: "Cancelled Appointments", permissionKey: "view_canceled_appointments" },
];

const Appointments = () => {
  const { hasPermission } = usePermissions();

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.permissionKey)),
    [hasPermission]
  );

  const [view, setView] = useState(visibleTabs[0]?.key || "");
  const [counts, setCounts] = useState({
    upcomingAppointments: 5,
    rescheduleRequests: 2,
    pastAppointments: undefined,
    cancelledAppointments: 1,
  });

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
                {counts[tab.key] !== undefined && (
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
