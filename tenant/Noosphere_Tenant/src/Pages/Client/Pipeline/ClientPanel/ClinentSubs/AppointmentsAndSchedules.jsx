import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import Button from "../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { showToast } from "../../../../../Helper/ShowToast";
import AppointmentModal from "../../../../../Components/ReusableModal/SchedulerModal/AppointmentModal";
import api from "../../../../../api/AppointmentApi";
import CustomTable from "../../../../../Components/Table/CustomTable";

const MemoAppointmentModal = memo(AppointmentModal);

const AppointmentsScheduleTab = () => {
  const { tenantId, token: accessToken } = useSelector((s) => s.authentication?.user || {});
  const refreshToken = accessToken;

  const [activeTab, setActiveTab] = useState("upcomingAppointments"); // upcoming, past, cancelled
  const [viewMode, setViewMode] = useState("staff"); // staff = table, client = calendar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [clients, setClients] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);

  // Mock + Real-looking Appointment Data
  const rawAppointments = useMemo(() => [
    {
      id: "1",
      clientName: "Emma Johnson",
      therapistNames: ["Dr. Sarah Miller", "Alex Chen"],
      serviceTypes: ["ABA Therapy", "Speech Therapy"],
      sessionType: "Direct 1:1",
      date: "2025-11-20",
      time: "10:00 AM - 11:30 AM",
      status: "confirmed",
      colorCode: "#10B981",
    },
    {
      id: "2",
      clientName: "Liam Garcia",
      therapistNames: ["Dr. James Park"],
      serviceTypes: ["Occupational Therapy"],
      sessionType: "Group Session",
      date: "2025-11-21",
      time: "2:00 PM - 3:00 PM",
      status: "confirmed",
      colorCode: "#3B82F6",
    },
    {
      id: "3",
      clientName: "Olivia Brown",
      therapistNames: ["Maria Lopez", "Daniel Kim"],
      serviceTypes: ["ABA Therapy"],
      sessionType: "Parent Training",
      date: "2025-11-18",
      time: "9:00 AM - 10:00 AM",
      status: "cancelled",
      colorCode: "#EF4444",
    },
    {
      id: "4",
      clientName: "Noah Davis",
      therapistNames: ["Rachel Green"],
      serviceTypes: ["Speech Therapy"],
      sessionType: "Direct 1:1",
      date: "2025-11-15",
      time: "11:00 AM - 12:00 PM",
      status: "completed",
      colorCode: "#6B7280",
    },
  ], []);

  // Filter appointments based on activeTab
  const filteredAppointments = useMemo(() => {
    if (activeTab === "upcomingAppointments")
      return rawAppointments.filter(a => new Date(a.date) >= new Date() && a.status !== "cancelled");
    if (activeTab === "pastAppointments")
      return rawAppointments.filter(a => new Date(a.date) < new Date() && a.status === "completed");
    if (activeTab === "cancelledAppointments")
      return rawAppointments.filter(a => a.status === "cancelled");
    return rawAppointments;
  }, [rawAppointments, activeTab]);

 const tableData = useMemo(() => 
  filteredAppointments.map(appt => ({
    id: appt.id,
    clientName: appt.clientName,
    therapistName: appt.therapistNames.join(", "),        // ← string
    serviceType: appt.serviceTypes.join(", "),            // ← string
    sessionType: appt.sessionType,
    dateTime: `${format(new Date(appt.date), "MMM dd, yyyy")} • ${appt.time}`,
    colorCode: appt.colorCode,
    hasActions: true
  })), 
  [filteredAppointments]
);

const filters = useMemo(() => {
  const clinicians = [...new Set(tableData.map(a => a.therapistName))].filter(Boolean)
    .map(n => ({ value: n, label: n }));
  const services = [...new Set(tableData.map(a => a.serviceType))].filter(Boolean)
    .map(s => ({ value: s, label: s }));
  const sessions = [...new Set(tableData.map(a => a.sessionType))].filter(Boolean)
    .map(s => ({ value: s, label: s }));

  return [
    { value: "therapistName", label: "Clinician", filterValues: clinicians,
      filterFunction: (row, val) => !val || row.therapistName.includes(val) },
    { value: "serviceType", label: "Service Type", filterValues: services,
      filterFunction: (row, val) => !val || row.serviceType.includes(val) },
    { value: "sessionType", label: "Session Type", filterValues: sessions,
      filterFunction: (row, val) => !val || row.sessionType === val },
  ];
}, [tableData]);

  // Table Columns
  const columns = [
    { header: "Client", key: "clientName" },
    { header: "Clinician(s)", key: "therapistName" },
    { header: "Service Type(s)", key: "serviceType" },
    { header: "Session Type", key: "sessionType" },
    { header: "Date & Time", key: "dateTime", type: "dayTime" },
  ];



  // Table Actions
  const actions = [
    {
      type: "dropdown",
      items: [
        { label: "View Details", onClick: (row) => console.log("View", row) },
        { label: "Edit Appointment", onClick: (row) => openModal(row) },
        { label: "Reschedule", onClick: (row) => openModal(row) },
        { label: "Cancel Appointment", onClick: (row) => console.log("Cancel", row), className: "remove" },
      ],
    },
  ];

  // Modal Handlers
  const openModal = (appointment = null) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <div >
      {/* Tabs */}
      <div className="documents-tabs w-full mt-6">
        {["upcomingAppointments", "pastAppointments", "cancelledAppointments"].map((tab) => (
          <button
            key={tab}
            className={`doc-tab flex-1 ${activeTab === tab ? "doc-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "upcomingAppointments" && "Upcoming Appointments"}
            {tab === "pastAppointments" && "Past Appointments"}
            {tab === "cancelledAppointments" && "Cancelled Appointments"}
          </button>
        ))}
      </div>

      {/* View Toggle + New Button */}
      <div className="cal-sched-filter-section">
        <div className="justify-between flex w-full mt-6">
          <div className="cal-sched-filter-controls">
            <span className="cal-sched-filter-label">View</span>
            <div className="cal-sched-tab-container">
              <button onClick={() => setViewMode("staff")} className={`cal-sched-tab-button ${viewMode === "staff" ? "active" : ""}`}>
                Table View
              </button>
              <div className="cal-sched-tab-divider" />
              <button onClick={() => setViewMode("client")} className={`cal-sched-tab-button ${viewMode === "client" ? "active" : ""}`}>
                Calendar View
              </button>
            </div>
          </div>
          <Button label="New Appointment" variant="primary" icon={<FaPlus />} onClick={() => openModal()} />
        </div>
      </div>

      {/* Content: Table or Calendar */}
      <div className="mt-6">
        {viewMode === "staff" ? (
          <CustomTable
            data={tableData}
            columns={columns}
            actions={actions}
            filters={filters}
            tableName="Appointments"
            itemsPerPage={10}
            showCheckbox={false}
            showActions={true}
          />
        ) : (
          <div className="bg-gray-50 border-2 border-dashed rounded-xl h-96 flex items-center justify-center text-gray-500">
            <p>Your Calendar Component Will Go Here</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <MemoAppointmentModal
        key={selectedAppointment?.id || "new"}
        isOpen={isModalOpen}
        onClose={closeModal}
        initialData={selectedAppointment}
        isEditMode={!!selectedAppointment}
        onSave={() => {}} // You'll connect this later
        clients={clients}
        sessionTypes={sessionTypes}
        staff={staff}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
      />
    </div>
  );
};

export default AppointmentsScheduleTab;