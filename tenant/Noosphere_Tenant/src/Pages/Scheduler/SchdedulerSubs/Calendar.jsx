import React from "react";
import CalendarScheduler from "../../../Components/CalendarScheduler/CalendarScheduler";
import { format } from "date-fns";
import DashboardLayout from "../../../Layout/TenantLayout";
const Calendar = () => {
  const formatTime = (date) => {
    return format(date, "h:mma").toLowerCase(); // e.g., "1:30pm"
  };

  const staff = [
    { id: 1, name: "Jonah Gutierrez", appointments: 14 },
    { id: 2, name: "Boy Alinco", appointments: 14 },
    // Add more staff...
  ];

  const client = [
    { id: 1, name: "Jonah Gutierrez", appointments: 14 },
    { id: 2, name: "Boy Alinco", appointments: 14 },
    // Add more staff...
  ];

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const appointments = [
    {
      id: 1,
      client: "Kelly Rowland",
      time: formatTime(
        new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          13,
          30
        )
      ), // 1:30PM yesterday
      start: new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        13,
        30
      ), // 1:30PM yesterday
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        16,
        30
      ), // 4:30PM yesterday
      color: "#f7c948",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 2,
      client: "Naomi Marley",
      time: formatTime(
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30)
      ), // 1:30PM today
      start: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        13,
        30
      ), // 1:30PM today
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        16,
        30
      ), // 4:30PM today
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 3,
      client: "Naomi Marley",
      time: formatTime(
        new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0)
      ), // 3:00PM today
      start: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        15,
        0
      ), // 3:00PM today
      end: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        18,
        0
      ), // 6:00PM today
      color: "#48f494",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 4,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          13,
          30
        )
      ), // 1:30PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        13,
        30
      ), // 1:30PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        16,
        30
      ), // 4:30PM tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 5,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          15,
          30
        )
      ), // 3:30PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        15,
        30
      ), // 3:30PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        18,
        30
      ), // 6:30PM tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 6,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          18,
          0
        )
      ), // 6:00PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        18,
        0
      ), // 6:00PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        20,
        0
      ), // 8:00PM tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
    {
      id: 7,
      client: "Naomi Marley",
      time: formatTime(
        new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          23,
          30
        )
      ), // 11:30PM tomorrow
      start: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        23,
        30
      ), // 11:30PM tomorrow
      end: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate() + 1,
        1,
        30
      ), // 1:30AM day after tomorrow
      color: "#48f794",
      therapist: "Jonah Gutierrez",
      serviceType: "H 123.4",
      sessionType: "Group Training",
      staffId: 1,
    },
  ];
  return (
    <DashboardLayout>
      <CalendarScheduler
        staff={staff}
        clients={client}
        appointments={appointments}
      />
    </DashboardLayout>
  );
};

export default Calendar;
