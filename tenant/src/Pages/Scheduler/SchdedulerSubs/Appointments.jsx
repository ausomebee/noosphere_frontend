import React, { useState } from "react";

import UpcomingAppointments from "./AppointmentSubs/UpcomingAppointments";
import RescheduleRequests from "./AppointmentSubs/RescheduleRequests";
import PastAppointments from "./AppointmentSubs/PastAppointments";
import CancelledAppointments from "./AppointmentSubs/CancelledAppointments";

const Appointments = () => {
  const [view, setView] = useState("upcomingAppointments");
  const [counts, setCounts] = useState({
    upcomingAppointments: 5,
    rescheduleRequests: 2,
    pastAppointments: undefined,
    cancelledAppointments: 1,
  });

  return (
    <>
      <div>
        <h1 className="appointment-sched-title">Appointments</h1>
        <div>
          <div className="appointment-sched-view-switcher">
            <button
              onClick={() => setView("upcomingAppointments")}
              className={`appointment-sched-view-button flex items-center ${
                view === "upcomingAppointments"
                  ? "appointment-sched-view-button-active"
                  : "appointment-sched-view-button-inactive"
              }`}
            >
              <span>Upcoming Appointments</span>
              {counts.upcomingAppointments !== undefined && (
                <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {counts.upcomingAppointments}
                </span>
              )}
            </button>
            <button
              onClick={() => setView("rescheduleRequests")}
              className={`appointment-sched-view-button flex items-center ${
                view === "rescheduleRequests"
                  ? "appointment-sched-view-button-active"
                  : "appointment-sched-view-button-inactive"
              }`}
            >
              <span>Reschedule Requests</span>
              {counts.rescheduleRequests !== undefined && (
                <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {counts.rescheduleRequests}
                </span>
              )}
            </button>
            <button
              onClick={() => setView("pastAppointments")}
              className={`appointment-sched-view-button flex items-center ${
                view === "pastAppointments"
                  ? "appointment-sched-view-button-active"
                  : "appointment-sched-view-button-inactive"
              }`}
            >
              <span>Past Appointments</span>
              {counts.pastAppointments !== undefined && (
                <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {counts.pastAppointments}
                </span>
              )}
            </button>
            <button
              onClick={() => setView("cancelledAppointments")}
              className={`appointment-sched-view-button flex items-center ${
                view === "cancelledAppointments"
                  ? "appointment-sched-view-button-active"
                  : "appointment-sched-view-button-inactive"
              }`}
            >
              <span>Cancelled Appointments</span>
              {counts.cancelledAppointments !== undefined && (
                <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {counts.cancelledAppointments}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="appointment-content">
          {view === "upcomingAppointments" && (
            <UpcomingAppointments
              counts={counts}
              setCounts={setCounts}
            />
          )}
          {view === "rescheduleRequests" && (
            <RescheduleRequests
              counts={counts}
              setCounts={setCounts}
            />
          )}
          {view === "pastAppointments" && (
            <PastAppointments
              counts={counts}
              setCounts={setCounts}
            />
          )}
          {view === "cancelledAppointments" && (
            <CancelledAppointments
              counts={counts}
              setCounts={setCounts}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Appointments;