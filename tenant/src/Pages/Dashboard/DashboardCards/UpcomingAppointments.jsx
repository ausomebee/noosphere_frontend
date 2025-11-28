import React from "react";
import Button from "../../../Components/Button/Button";

const UpcomingAppointments = ({hasData}) => {
  const dummyData = [
    {
      client: "Oliver Khan",
      therapist: "Wummi Alade",
      services: "97151, 97152,...",
      type: "Tele-health Session",
      date: "12/12/2024",
      time: "12:45pm - 4:15pm",
    },
    {
      client: "Oliver Khan",
      therapist: "Wummi Alade",
      services: "97151, 97152,...",
      type: "1:1 coaching",
      date: "12/12/2024",
      time: "12:45pm - 4:15pm",
    },
    {
      client: "Oliver Khan",
      therapist: "Wummi Alade",
      services: "97151, 97152,...",
      type: "Group coaching",
      date: "12/12/2024",
      time: "12:45pm - 4:15pm",
    },
  ];

  return (
    <>
    {hasData ? (
    <div className="custom-table-container">
      <table className="w-full text-sm table-container custom-table">
        <thead>
          <tr className="text-left text-gray-600">
            <th>Client</th>
            <th>Therapist</th>
            <th>Service Type(s)</th>
            <th>Session Type</th>
            <th>Date</th>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dummyData.map((appointment, idx) => (
            <tr key={idx} className="border-t">
              <td className="text-blue-600 custom-blue-text">{appointment.client}</td>
              <td>{appointment.therapist}</td>
              <td className="text-blue-600 custom-blue-text">{appointment.services}</td>
              <td>{appointment.type}</td>
              <td>{appointment.date}</td>
              <td>{appointment.time}</td>
              <td>
                .
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    ) : (
      <div className="text-center p-4">
        <p className="text-muted text-lg mb-4">No Data to show</p>
        <p className="text-muted mb-16">
          You have not set any appointment yet. Your upcoming appointments will be displayed here
        </p>
        <Button
          label="Setup an Appointment"
          variant="primary"
          className="mx-auto block px-6 py-2"
          onClick={() => (window.location.href = "/schedule-appointment")}
        />
      </div>
    )}
     </>
  );
};

export default UpcomingAppointments;