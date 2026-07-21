// src/pages/Client/ClientSubs/AppointmentsAndSchedules/AppointmentsScheduleTab.jsx
import { useState, memo, useCallback, useEffect, useMemo } from "react";
import useAuth from "../../../../../hooks/useAuth";
import usePermissions from "../../../../../hooks/usePermissions";
import { format, addDays, subDays } from "date-fns";
import Button from "../../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import { showToast, showApiError } from "../../../../../Helper/ShowToast";
import AppointmentModal from "../../../../../Components/ReusableModal/SchedulerModal/AppointmentModal";
import api from "../../../../../api/AppointmentApi";
import api2 from "../../../../../api/clientPanelApis";
import api3 from "../../../../../api/billingAndPaymentsApi"; // For real service codes
import CustomTable from "../../../../../Components/Table/CustomTable";
import MonthView from "../../../../../Components/CalendarScheduler/MonthView";
import { SearchInput } from "../../../../../Components/Input/Inputs";
import { useParams, useNavigate } from "react-router-dom";

import expand from "../../../../../utils/expand";
import expandForAppointments from "../../../../../utils/expandForAppointments";

const MemoAppointmentModal = memo(AppointmentModal);

const AppointmentsScheduleTab = ({ fullName }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [activeTab, setActiveTab] = useState("upcomingAppointments");
  const [viewMode, setViewMode] = useState("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Real service code map: serviceCodeId → code (e.g., "97158")
  const [serviceCodeMap, setServiceCodeMap] = useState({});
  // Full list of service codes to pass to modal
  const [serviceCodes, setServiceCodes] = useState([]);

  // Fetch real service codes
  const fetchServiceCodes = useCallback(async () => {
    if (!tenantId || !accessToken) return;

    try {
      const response = await api3.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response?.data || [];

      const map = {};
      const fullList = data.filter((item) => !item.isDeleted && item.isActive);

      fullList.forEach((item) => {
        map[item.id] = item.code;
      });

      setServiceCodeMap(map);
      setServiceCodes(fullList); // Pass full objects to modal
    } catch (error) {
      console.error("Failed to load service codes:", error);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchServiceCodes();
  }, [fetchServiceCodes]);

  // Prepare data for modal — consistent with CalendarScheduler
  const prepareModalData = (appt) => {
    if (!appt) return null;

    const clinicianIds = appt.clinicians?.map((c) => c.id.toString()) || [];

    const service = (appt.appointmentServices || []).map((as) => ({
      serviceCodeId: as.serviceCodeId,
      modifier: as.modifiers?.modifier || "", // "HP"
    }));

    return {
      ...appt,
      sessionType: appt.session?.id || "",
      clinicians: clinicianIds,
      service:
        service.length > 0 ? service : [{ serviceCodeId: "", modifier: "" }],
      colorCode: appt.colourCode || "#3B82F6",
    };
  };

  // Transform for table — use real code from map
  const toTableRow = (apiAppt) => {
    const service = (apiAppt.appointmentServices || []).map((as) => {
      const code = serviceCodeMap[as.serviceCodeId] || "N/A";
      const modifier = as.modifiers?.modifier
        ? ` (${as.modifiers.modifier})`
        : "";

      return {
        serviceType: `${code}${modifier}`,
      };
    });

    return {
      ...apiAppt,
      service: service.length > 0 ? service : [{ serviceType: "N/A" }],
      client: apiAppt.client || { fullName: "Unknown Client" },
      clinicians: apiAppt.clinicians || [],
      session: apiAppt.session || { name: "Unknown Session" },
      colourCode: apiAppt.colourCode || "#3B82F6",
    };
  };

  const currentClient = useMemo(() => {
    if (!clientId) return null;

    if (clients.length > 0) {
      const client = clients.find(
        (c) => c.id === clientId || c.clientId === clientId
      );
      if (client) {
        return {
          clientId: client.id || client.clientId,
          client: {
            firstName:
              client.firstName || client.fullName?.split(" ")[0] || "Client",
            lastName:
              client.lastName ||
              client.fullName?.split(" ").slice(1).join(" ") ||
              "",
          },
          ...client,
        };
      }
    }

    const nameParts = (fullName || "Current Client").split(" ");
    return {
      clientId,
      client: {
        firstName: nameParts[0] || "Client",
        lastName: nameParts.slice(1).join(" ") || "",
      },
      firstName: nameParts[0] || "Client",
      lastName: nameParts.slice(1).join(" ") || "",
      fullName: fullName || "Current Client",
    };
  }, [clients, clientId, fullName]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [sess, stf] = await Promise.all([
        api
          .GetSessionTypeActiveByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          })
          .then((r) => r.data?.data || []),
        api
          .GetTenantStaffByTenantId({ tenantId, accessToken, refreshToken })
          .then((r) => r.data?.data || []),
      ]);
      setSessionTypes(sess);
      setStaff(stf);

      if (clientId) {
        try {
          const res = await api2.GetSingleClientByClientId({
            id: clientId,
            accessToken,
            refreshToken,
          });
          if (res?.data?.data) {
            const data = res.data.data;
            setClients([
              {
                clientId: data.id || data.clientId,
                client: {
                  firstName:
                    data.firstName || data.fullName?.split(" ")[0] || "Client",
                  lastName:
                    data.lastName ||
                    data.fullName?.split(" ").slice(1).join(" ") ||
                    "",
                },
                ...data,
              },
            ]);
          }
        } catch (err) {
          console.error("Failed to fetch client:", err);
        }
      }
    } catch (err) {
      console.error("Failed to load support data:", err);
    }
  }, [tenantId, accessToken, refreshToken, clientId]);

  const fetchAppointments = useCallback(async () => {
    if (!clientId) return showToast("Client ID not found", "error");

    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case "upcomingAppointments":
          response = await api2.GetClientUpcomingAppointments({
            id: clientId,
            accessToken,
            refreshToken,
          });
          break;
        case "pastAppointments":
          response = await api2.GetClientPastAppointments({
            id: clientId,
            accessToken,
            refreshToken,
          });
          break;
        case "cancelledAppointments":
          response = await api2.GetClientCancelAppointments({
            id: clientId,
            accessToken,
            refreshToken,
          });
          break;
        default:
          response = { data: { data: [] } };
      }

      const raw = response?.data?.data || response?.data || [];
      const transformed = raw.map(toTableRow);
      setAppointments(transformed);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, clientId, accessToken, refreshToken, serviceCodeMap]);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // TABLE VIEW
  const formattedAppointments = useMemo(() => {
    if (!appointments.length) return [];

    if (activeTab === "cancelledAppointments") {
      return appointments.map((appt) => ({
        id: appt.id,
        clientName: currentClient?.fullName || "Current Client",
        therapistName:
          appt.clinicians?.map((c) => c.fullName).join(", ") || "Unassigned",
        serviceType:
          appt.service?.map((s) => s.serviceType).join(", ") || "N/A",
        sessionType: appt.session?.name || "N/A",
        date: appt.date || "Unknown Date",
        time:
          appt.startTime && appt.endTime
            ? `${appt.startTime} - ${appt.endTime}`
            : "No Time",
        dateTime: appt.date
          ? `${format(new Date(appt.date), "MMM dd, yyyy")} • ${
              appt.startTime || ""
            }`
          : "Unknown Date",
        colorCode: appt.colourCode || "#3B82F6",
        hasActions: true,
        rawData: appt,
      }));
    }

    const direction = activeTab === "pastAppointments" ? "past" : "future";

    return appointments.flatMap((master) => {
      const expanded = expandForAppointments(master, direction);

      return expanded.map((instance) => ({
        id: instance.id,
        clientName: currentClient?.fullName || "Current Client",
        therapistName:
          (instance.clinicians || master.clinicians)
            ?.map((c) => c.fullName)
            .join(", ") || "Unassigned",
        serviceType:
          master.service?.map((s) => s.serviceType).join(", ") || "N/A",
        sessionType: (instance.session || master.session)?.name || "N/A",
        date: instance.date,
        time: `${instance.startTime} - ${instance.endTime}`,
        dateTime: `${format(new Date(instance.date), "MMM dd, yyyy")} • ${
          instance.startTime
        }`,
        colorCode: instance.colourCode || master.colourCode || "#3B82F6",
        hasActions: true,
        rawData: { ...master, ...instance },
      }));
    });
  }, [appointments, activeTab, currentClient]);

  // CALENDAR VIEW
  const calendarAppointments = useMemo(() => {
    if (!appointments.length) return [];

    if (activeTab === "cancelledAppointments") {
      return appointments
        .filter((a) => a.date)
        .map((appt) => ({
          id: appt.id,
          clientId,
          clientName:
            appt.client?.fullName ||
            currentClient?.fullName ||
            "Current Client",
          clinicianIds: appt.clinicians?.map((c) => c.id.toString()) || [],
          service: appt.service || [],
          sessionId: appt.session?.id || "",
          date: appt.date,
          startTime: appt.startTime,
          endTime: appt.endTime,
          colourCode: appt.colourCode || "#3B82F6",
          title:
            appt.service?.map((s) => s.serviceType).join(", ") || "Appointment",
        }));
    }

    const viewWindow = {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      ),
    };

    return appointments.flatMap((master) => {
      const expanded = expand(master, viewWindow);
      return expanded.map((instance) => ({
        id: instance.id,
        clientId,
        clientName:
          instance.client?.fullName ||
          currentClient?.fullName ||
          "Current Client",
        clinicianIds: instance.clinicians?.map((c) => c.id.toString()) || [],
        service: master.service || [],
        sessionId: master.session?.id || "",
        date: instance.date,
        startTime: instance.startTime,
        endTime: instance.endTime,
        colourCode: instance.colourCode || "#3B82F6",
        title:
          master.service?.map((s) => s.serviceType).join(", ") || "Appointment",
      }));
    });
  }, [appointments, activeTab, currentDate, clientId, currentClient]);

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return formattedAppointments;
    const term = searchTerm.toLowerCase();
    return formattedAppointments.filter(
      (appt) =>
        appt.therapistName?.toLowerCase().includes(term) ||
        appt.serviceType?.toLowerCase().includes(term) ||
        appt.sessionType?.toLowerCase().includes(term) ||
        appt.date?.toLowerCase().includes(term) ||
        appt.time?.toLowerCase().includes(term)
    );
  }, [formattedAppointments, searchTerm]);

  const filters = useMemo(() => {
    const clinicians = [
      ...new Set(formattedAppointments.map((a) => a.therapistName)),
    ]
      .filter(Boolean)
      .map((n) => ({ value: n, label: n }));
    const services = [
      ...new Set(formattedAppointments.map((a) => a.serviceType)),
    ]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));
    const sessions = [
      ...new Set(formattedAppointments.map((a) => a.sessionType)),
    ]
      .filter(Boolean)
      .map((s) => ({ value: s, label: s }));

    return [
      {
        value: "therapistName",
        label: "Clinician",
        filterValues: clinicians,
        filterFunction: (row, val) => !val || row.therapistName.includes(val),
      },
      {
        value: "serviceType",
        label: "Service Type",
        filterValues: services,
        filterFunction: (row, val) => !val || row.serviceType.includes(val),
      },
      {
        value: "sessionType",
        label: "Session Type",
        filterValues: sessions,
        filterFunction: (row, val) => !val || row.sessionType === val,
      },
    ];
  }, [formattedAppointments]);

  const columns = [
    { header: "Clinician(s)", key: "therapistName", type: "text" },
    { header: "Service Type(s)", key: "serviceType", type: "text" },
    { header: "Session Type", key: "sessionType", type: "text" },
    { header: "Date", key: "date", type: "dateTime" },
    { header: "Time", key: "time", type: "text" },
  ];

  const actions = [
    {
      type: "dropdown",
      items: [
        hasPermission("edit_appointments") && {
          label: "Edit Appointment",
          onClick: (row) => openModal(row),
        },
      ].filter(Boolean),
    },
  ].filter((a) => a.items.length > 0);

  const handleAppointmentClick = (appointment) => {
    const full = appointments.find(
      (a) => a.id === appointment.id.split("_")[0]
    );
    if (full) openModal(full);
  };

  const openModal = (appointment = null) => {
    if (!appointment) {
      setSelectedAppointment(null);
      setIsModalOpen(true);
      return;
    }

    const fullAppt = appointment.rawData || appointment;
    const preparedData = prepareModalData(fullAppt);

    if (!preparedData) {
      showToast("Failed to prepare appointment data", "error");
      return;
    }

    // Ensure at least one service entry
    if (!preparedData.service || preparedData.service.length === 0) {
      preparedData.service = [{ serviceCodeId: "", modifier: "" }];
    }

    setSelectedAppointment(preparedData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleSaveAppointment = async (data) => {
    try {
      // Shape the payload exactly as the Scheduler does: the modal returns a
      // raw form (clinician ids, `billable`, flat recurrence fields) that the
      // API does not accept -- map them instead of spreading `...data`.
      const payload = {
        tenantId,
        clientId: data.client || clientId,
        sessionId: data.sessionType,
        clinicians: (data.clinicians || []).map((id) => ({ id })),
        service: data.service,
        date: data.date,
        isRecurring: data.isRecurring,
        startTime: data.startTime,
        endTime: data.endTime,
        recurrence: data.recurrence || {},
        isBillable: data.billable,
        serviceLocation: data.serviceLocation,
        requiresTravel: data.requiresTravel,
        colourCode: data.colorCode,
        accessToken,
        refreshToken,
      };

      if (selectedAppointment?.id) {
        const id =
          selectedAppointment.id.split("_")[0] || selectedAppointment.id;
        await api.UpdateAppointments({
          ...payload,
          id,
          forAll: data.scope === "all",
        });
        showToast("Appointment updated!", "success");
      } else {
        await api.CreateAppointments(payload);
        showToast("Appointment created!", "success");
      }

      closeModal();
      fetchAppointments();
    } catch (err) {
      showApiError(err, "SAVE_APPOINTMENT");
      // Re-throw so the AppointmentModal stays open on a failed save.
      throw err;
    }
  };

  const handlePrevMonth = () => setCurrentDate(subDays(currentDate, 30));
  const handleNextMonth = () => setCurrentDate(addDays(currentDate, 30));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="appt-sched-wrapper">
      <div className="documents-tabs w-full">
        {[
          "upcomingAppointments",
          "pastAppointments",
          "cancelledAppointments",
        ].map((tab) => (
          <button
            key={tab}
            className={`doc-tab flex-1 ${
              activeTab === tab ? "doc-tab-active" : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "upcomingAppointments" && "Upcoming Appointments"}
            {tab === "pastAppointments" && "Past Appointments"}
            {tab === "cancelledAppointments" && "Cancelled Appointments"}
          </button>
        ))}
      </div>

      <div className="appt-controls-row">
        <div className="flex items-center gap-4">
          <div className="cal-sched-filter-controls">
            <div className="cal-sched-tab-container">
              <button
                onClick={() => setViewMode("table")}
                className={`cal-sched-tab-button flex items-center gap-2 ${
                  viewMode === "table" ? "active" : ""
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6.66667 5H17.5M6.66667 10H17.5M6.66667 15H17.5M2.5 5H2.50833M2.5 10H2.50833M2.5 15H2.50833"
                    stroke="currentColor"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Table View
              </button>
              <div className="cal-sched-tab-divider" />
              <button
                onClick={() => setViewMode("calendar")}
                className={`cal-sched-tab-button flex items-center gap-2 ${
                  viewMode === "calendar" ? "active" : ""
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M13.3333 1.66699V5.00033M6.66667 1.66699V5.00033M2.5 8.33366H17.5M4.16667 3.33366H15.8333C16.7538 3.33366 17.5 4.07985 17.5 5.00033V16.667C17.5 17.5875 16.7538 18.3337 15.8333 18.3337H4.16667C3.24619 18.3337 2.5 17.5875 2.5 16.667V5.00033C2.5 4.07985 3.24619 3.33366 4.16667 3.33366Z"
                    stroke="currentColor"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Calendar View
              </button>
            </div>
          </div>
        </div>
        {hasPermission("create_a_new_appointment") && (
          <Button
            label="New Appointment"
            variant="primary"
            icon={<FaPlus />}
            onClick={() => openModal()}
          />
        )}
      </div>

      {viewMode === "calendar" && (
        <div className="appt-calendar-nav">
          <div className="appt-calendar-nav-controls">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-3xl hover:bg-gray-200 rounded"
              >
                &lt;
              </button>
              <button onClick={handleToday} className="px-3 py-1">
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 text-3xl hover:bg-gray-200 rounded"
              >
                &gt;
              </button>
              <span className="ml-4 font-semibold">
                {format(currentDate, "MMMM yyyy")}
              </span>
            </div>
          </div>
          <div style={{ marginBottom: "-10px" }}>
            <SearchInput
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              width="full"
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        {viewMode === "table" ? (
          <CustomTable
            data={filteredAppointments}
            columns={columns}
            {...(activeTab === "pastAppointments"
              ? {
                  // Past appointments can't be edited — a simple link to the
                  // timesheets instead of the Edit action.
                  actionText: "Go to Timesheets",
                  onActionClick: () => navigate("/billing/timesheets"),
                }
              : { actions })}
            filters={filters}
            tableName={activeTab
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())}
            itemsPerPage={10}
            loading={loading}
            showCheckbox={false}
            showActions={true}
          />
        ) : (
          <div className="appt-calendar-container">
            <MonthView
              date={currentDate}
              appointments={calendarAppointments}
              clients={[currentClient].filter(Boolean)}
              onAppointmentClick={handleAppointmentClick}
            />
          </div>
        )}
      </div>

      <MemoAppointmentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        initialData={selectedAppointment || null}
        isEditMode={!!selectedAppointment}
        onSave={handleSaveAppointment}
        clients={currentClient ? [currentClient] : []}
        sessionTypes={sessionTypes}
        staff={staff}
        serviceCodes={serviceCodes}
        accessToken={accessToken}
        refreshToken={refreshToken}
        tenantId={tenantId}
        initialClientId={clientId}
      />
    </div>
  );
};

export default AppointmentsScheduleTab;
