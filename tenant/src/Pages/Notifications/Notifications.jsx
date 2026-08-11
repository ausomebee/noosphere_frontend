import usePageTitle from "../../hooks/usePageTitle";
import Pagination from "../../Components/Table/Pagination";

const ITEMS_PER_PAGE = 10;
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notificationApi from "../../api/notificationApi";
import { emitNotificationRead, onNotification } from "../../api/socketService";
import useAuth from "../../hooks/useAuth";
import {
  IoClose,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoNotificationsOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
} from "react-icons/io5";
import { formatDateHeader, formatMsgTime, formatTime } from "../../Helper/Formatters";
import useFormatSettings from "../../hooks/useFormatSettings";
import { getNotificationAction } from "../../Data/notificationConfig";
import "./Notifications.css";
import SectionLoader from "../../Components/SectionLoader";
import appointmentApi from "../../api/AppointmentApi";
import AppointmentViewModal from "../../Components/ReusableModal/SchedulerModal/AppointmentViewModal";
import RescheduleRequestActionModal from "../../Components/ReusableModal/SchedulerModal/RescheduleRequestActionModal";
import RescheduleModal from "../../Components/ReusableModal/SchedulerModal/RescheduleModal";
import RejectConfirmationModal from "../../Components/ReusableModal/SchedulerModal/RejectConfirmationModal";
import { showToast, showApiError } from "../../Helper/ShowToast";
import {
  clientDisplayName,
  normalizeRescheduleRequest,
  toServiceRows,
} from "../../utils/appointmentDisplay";

const ICON_MAP = {
  appointment: IoCalendarOutline,
  document: IoDocumentTextOutline,
  client: IoPersonOutline,
  system: IoNotificationsOutline,
  success: IoCheckmarkCircleOutline,
  alert: IoAlertCircleOutline,
};

// Map a notification type to an icon key
const resolveType = (notif) => {
  const t = (notif.type || notif.category || "").toLowerCase();
  if (t.includes("appointment") || t.includes("reschedule")) return "appointment";
  if (t.includes("document") || t.includes("form") || t.includes("report") || t.includes("timesheet")) return "document";
  if (t.includes("client")) return "client";
  if (t.includes("approved") || t.includes("completed") || t.includes("signed") || t.includes("resolved")) return "success";
  if (t.includes("expir") || t.includes("cancel") || t.includes("reject") || t.includes("exhaust")) return "alert";
  return "system";
};

const resolveDate = (notif) => {
  if (!notif.createdAt) return "Other";
  return formatDateHeader(notif.createdAt);
};

const resolveTime = (notif, timeFormat) => {
  if (!notif.createdAt) return "";
  return formatMsgTime(notif.createdAt, timeFormat);
};

const Notifications = () => {
  const navigate = useNavigate();
  const {
    userId,
    accessToken,
    refreshToken,
    tenantId,
    role: authRole,
  } = useAuth();
  const { timeFormat } = useFormatSettings();
  usePageTitle("Notifications");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  // Modals opened straight from a notification, without leaving this page.
  const [viewAppt, setViewAppt] = useState(null);
  const [rescheduleRequest, setRescheduleRequest] = useState(null);
  const [modifyTarget, setModifyTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [opening, setOpening] = useState(false);
  const role = authRole?.name ?? "Client";

  const loadNotifications = useCallback(() => {
    if (!userId || !accessToken) return;
    setLoading(true);
    notificationApi
      .getNotifications({ userId, userType: "TENANT_STAFF", accessToken, refreshToken })
      .then((res) => {
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        // Each item may arrive flat or wrapped as { notification: {...} }.
        const list = (Array.isArray(raw) ? raw : []).map((n) => n?.notification ?? n);
        setNotifications(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, accessToken, refreshToken]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Live updates: the socket pushes a "newNotification" whose payload uses the
  // same keys as the fetched list, so prepend it directly — no refresh needed.
  useEffect(() => {
    const unsub = onNotification((incoming) => {
      const notif = incoming?.notification ?? incoming;
      if (!notif) return;
      setNotifications((prev) => {
        if (notif.id && prev.some((n) => n.id === notif.id)) {
          return prev.map((n) => (n.id === notif.id ? { ...n, ...notif } : n));
        }
        return [notif, ...prev];
      });
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Client-side pagination: page through the full list, then group each page
  // by date so the headers stay correct within the page.
  const totalPages = Math.max(1, Math.ceil(notifications.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pageItems = notifications.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const groupedNotifications = pageItems.reduce((groups, notif) => {
    const date = resolveDate(notif);
    if (!groups[date]) groups[date] = [];
    groups[date].push(notif);
    return groups;
  }, {});

  // Mark a single notification read (optimistic + server + socket).
  const markRead = (notif) => {
    if (notif.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    notificationApi
      .markNotificationRead({ id: notif.id, accessToken, refreshToken })
      .catch(() => {
        // Non-critical — UI already updated optimistically
      });
    emitNotificationRead(notif.id);
  };

  // Primary action: mark read, then navigate to the mapped destination.
  const entityIdOf = (n) =>
    n?.entityId ?? n?.data?.entityId ?? n?.metadata?.entityId ?? null;

  const proposedSlotOf = (n) => {
    const m = n?.metadata ?? n?.data ?? {};
    if (!m.proposedDate && !m.proposedStartTime && !m.proposedEndTime) return null;
    return {
      date: m.proposedDate ?? null,
      startTime: m.proposedStartTime ?? null,
      endTime: m.proposedEndTime ?? null,
    };
  };

  const slotTime = (start, end) =>
    start && end
      ? `${formatTime(start, timeFormat)} - ${formatTime(end, timeFormat)}`
      : "N/A";

  // Shape a normalised reschedule request into the row the action modal (and
  // the Reschedule Requests table) expects, so behaviour stays identical.
  const toRequestRow = useCallback(
    (r) => ({
      id: r.requestId || r.appointmentId,
      appointmentId: r.appointmentId,
      clientId: r.clientId,
      clientName: clientDisplayName(r.client, "Unknown Client"),
      therapistName:
        r.clinicians.map((c) => c.fullName).filter(Boolean).join(", ") ||
        "Unassigned",
      serviceType: r.services.map((s) => s.serviceType).join(", ") || "N/A",
      sessionType: r.session?.name || "N/A",
      prevDateTime: {
        date: r.previous.date || "N/A",
        time: slotTime(r.previous.startTime, r.previous.endTime),
      },
      newDateTime: {
        date: r.requested.date || "N/A",
        time: slotTime(r.requested.startTime, r.requested.endTime),
      },
      date: r.requested.date,
      startTime: r.requested.startTime,
      endTime: r.requested.endTime,
    }),
    [timeFormat], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Open the reschedule request behind a notification. The notification carries
  // the APPOINTMENT id, while accepting/rejecting needs the REQUEST id — so
  // find the matching request in the list.
  const openRescheduleRequest = useCallback(
    async (notif, appointmentId) => {
      const res = await (role === "Staff"
        ? appointmentApi.GetRescheduleAppointmentReqByStaffId({
            staffId: userId,
            accessToken,
            refreshToken,
          })
        : appointmentApi.GetRescheduleAppointmentReqByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          }));
      const match = (res?.data?.data || []).find(
        (r) => (r.appointmentId || r.appointment?.id) === appointmentId,
      );
      if (!match) return false;
      setRescheduleRequest(
        toRequestRow(normalizeRescheduleRequest(match, proposedSlotOf(notif))),
      );
      return true;
    },
    [role, userId, tenantId, accessToken, refreshToken, toRequestRow],
  );

  // Open the read-only appointment details behind a notification.
  const openAppointmentDetails = useCallback(
    async (appointmentId) => {
      const res = await appointmentApi.GetClientAppointmentDetails({
        Id: appointmentId,
        accessToken,
        refreshToken,
      });
      const appt = res?.data?.data ?? res?.data ?? null;
      if (!appt) return false;
      const services = toServiceRows(appt.appointmentServices);
      setViewAppt({
        id: appt.id,
        clientName: clientDisplayName(appt.client, "Unknown Client"),
        therapistName:
          (appt.clinicians || []).map((c) => c.fullName).filter(Boolean).join(", ") ||
          "Unassigned",
        serviceType: services.map((s) => s.serviceType).join(", ") || "N/A",
        serviceTypes: services.map((s) => s.serviceType),
        sessionType: appt.session?.name || "N/A",
        date: appt.date,
        time: slotTime(appt.startTime, appt.endTime),
      });
      return true;
    },
    [accessToken, refreshToken, timeFormat], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Primary action. When the notification points at a record we can load, show
  // it in a modal right here; only fall back to routing when it doesn't (e.g.
  // the backend didn't send an entityId).
  const handleAction = async (notif) => {
    markRead(notif);
    const entityId = entityIdOf(notif);
    const isAppointment =
      notif?.entityType === "APPOINTMENT" ||
      String(notif?.type || "").includes("APPOINTMENT");

    if (entityId && (isAppointment || notif?.type === "NEW_RESCHEDULE_REQUEST")) {
      setOpening(true);
      try {
        const opened =
          notif?.type === "NEW_RESCHEDULE_REQUEST"
            ? await openRescheduleRequest(notif, entityId)
            : await openAppointmentDetails(entityId);
        if (opened) return;
      } catch {
        // Fall through to routing below.
      } finally {
        setOpening(false);
      }
    }

    const action = getNotificationAction(notif);
    if (action?.path) {
      navigate(action.path, action.state ? { state: action.state } : undefined);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (!unread.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.all(
      unread.map((n) => {
        emitNotificationRead(n.id);
        return notificationApi
          .markNotificationRead({ id: n.id, accessToken, refreshToken })
          .catch(() => {});
      })
    );
    // Refresh from the server so the list reflects the persisted read state.
    loadNotifications();
  };

  const handleClose = () => {
    navigate(-1);
  };

  // ---- Reschedule request actions (same endpoints as the requests table) ----
  const handleApproveRequest = async () => {
    const req = rescheduleRequest;
    if (!req) return;
    try {
      await appointmentApi.ApproveRescheduledReq({
        appointments: [{ id: req.id }],
        accessToken,
        refreshToken,
      });
      showToast("Reschedule request approved", "success");
      setRescheduleRequest(null);
    } catch (err) {
      showApiError(err, "APPROVE_RESCHEDULE");
    }
  };

  const handleSaveReject = async (rejectData) => {
    try {
      const appointments = Array.isArray(rejectData.appointments)
        ? rejectData.appointments.map((a) => ({ id: a.id }))
        : [{ id: rejectData.appointments.id }];
      await appointmentApi.RejectRescheduledReq({
        appointments,
        accessToken,
        refreshToken,
      });
      showToast("Reschedule request rejected", "success");
      setRejectTarget(null);
      setRescheduleRequest(null);
    } catch (err) {
      showApiError(err, "REJECT_RESCHEDULE");
    }
  };

  const handleSaveModify = async (data) => {
    try {
      await appointmentApi.RescheduleAppointments({
        tenantId,
        id: modifyTarget?.appointmentId || modifyTarget?.id,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        forAll: data.scope === "all",
        rescheduled: true,
        accessToken,
        refreshToken,
      });
      showToast("Appointment rescheduled", "success");
      setModifyTarget(null);
      setRescheduleRequest(null);
    } catch (err) {
      showApiError(err, "RESCHEDULE_APPOINTMENT");
    }
  };

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <div className="notifications-header-left">
          <h1 className="notifications-title">Notifications</h1>
          {unreadCount > 0 && (
            <span className="notifications-count">{unreadCount}</span>
          )}
        </div>
        <div className="notifications-header-actions">
          {unreadCount > 0 && (
            <button className="notifications-mark-all" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
          )}
          <button className="notifications-close" onClick={handleClose}>
            <IoClose size={18} />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Notification groups */}
      <div className="notifications-body">
        {loading ? (
          <SectionLoader />
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <IoNotificationsOutline size={48} />
            <p>No notifications</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date} className="notifications-group">
              <h3 className="notifications-group-date">{date}</h3>
              <div className="notifications-list">
                {items.map((notif) => {
                  const type = resolveType(notif);
                  const Icon = ICON_MAP[type] || IoNotificationsOutline;
                  const action = getNotificationAction(notif);
                  return (
                    <div
                      key={notif.id}
                      className={`notification-card ${!notif.isRead ? "notification-card-unread" : ""}`}
                    >
                      <div className={`notification-card-icon notification-icon-${type}`}>
                        <Icon size={20} />
                      </div>
                      <div className="notification-card-content">
                        <h4 className="notification-card-title">
                          {notif.title || notif.message || "Notification"}
                        </h4>
                        <p className="notification-card-desc">
                          {notif.content || notif.description || notif.body || ""}
                        </p>
                        <div className="notification-card-footer">
                          <span className="notification-card-time">{resolveTime(notif, timeFormat)}</span>
                          <button
                            className="notification-card-link"
                            onClick={() => handleAction(notif)}
                            disabled={opening}
                          >
                            {action?.label || "View details"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Opened straight from a notification — no page change. Appointments are
          read-only here; reschedule requests keep their three actions. */}
      <AppointmentViewModal
        isOpen={!!viewAppt}
        appointment={viewAppt}
        onClose={() => setViewAppt(null)}
      />

      <RescheduleRequestActionModal
        isOpen={!!rescheduleRequest}
        request={rescheduleRequest}
        onClose={() => setRescheduleRequest(null)}
        onApprove={handleApproveRequest}
        onModify={() => setModifyTarget(rescheduleRequest)}
        onReject={() => setRejectTarget(rescheduleRequest)}
      />

      <RescheduleModal
        isOpen={!!modifyTarget}
        onClose={() => setModifyTarget(null)}
        appointment={modifyTarget}
        onSave={handleSaveModify}
      />

      <RejectConfirmationModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleSaveReject}
        appointments={rejectTarget ? [rejectTarget] : []}
      />
    </div>
  );
};

export default Notifications;
