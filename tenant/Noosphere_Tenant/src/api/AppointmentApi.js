import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";
import { get } from "react-hook-form";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateAppointments = async ({
  tenantId,
  clientId,
  sessionId,
  clinicians,
  service,
  date,
  isRecurring,
  startTime,
  endTime,
  recurrence,
  isBillable,
  serviceLocation,
  requiresTravel,
  colourCode,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const formatLocalDate = (dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const payload = {
      clientId,
      tenantId,
      sessionId,
      clinicians,
      service,
      date: formatLocalDate(date),
      isRecurring,
      startTime,
      endTime,
      recurrence,
      isBillable,
      serviceLocation,
      requiresTravel,
      colourCode,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/appointments`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Appointment failed");
  }
};
const UpdateAppointments = async ({
  id,
  tenantId,
  clientId,
  sessionId,
  clinicians,
  service,
  date,
  isRecurring,
  startTime,
  endTime,
  recurrence,
  isBillable,
  serviceLocation,
  requiresTravel,
  colourCode,
  relatedAppointment,
  forAll,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      clientId,
      tenantId,
      sessionId,
      clinicians,
      service,
      date,
      isRecurring,
      startTime,
      endTime,
      recurrence,
      isBillable,
      serviceLocation,
      requiresTravel,
      colourCode,
      relatedAppointment,
      forAll,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/appointments`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Appointment failed");
  }
};

const GetSessionTypeActiveByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/session-types/active/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message || "Get session Type active by tenant id failed"
    );
  }
};
const GetClientByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(error.message || "Get Client by tenant id failed");
  }
};
const GetTenantStaffByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant/staff/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(error.message || "Get Tenant Staff by tenant id failed");
  }
};
const GetAppointmentByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message || "Get Tenant All Appointments by tenant id failed"
    );
  }
};
const GetAppointmentByStaffId = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/${staffId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message || "Get Staff All Appointments by staff id failed"
    );
  }
};
const GetAppointmentByClientId = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/${clientId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message || "Get Client All Appointments by client id failed"
    );
  }
};

const CancelAppointments = async ({
  tenantId,
  id,
  isCanceled = true,
  relatedAppointment,
  reason,
  forAll,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      id,
      isCanceled,
      reasonForCancel: reason,
      relatedAppointment,
      forAll,
      canceledBy: "Staff/Admin",
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/appointments`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Cancel Appointment failed");
  }
};

const RescheduleAppointments = async ({
  tenantId,
  id,
  date,
  startTime,
  endTime,
  relatedAppointment,
  forAll,
  rescheduled,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  // Format date without timezone conversion
  const formatLocalDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  try {
    const payload = {
      tenantId,
      id,
      date: formatLocalDate(date),
      startTime,
      endTime,
      relatedAppointment,
      forAll,
      isRecurring: false,
      recurrence: {},
      rescheduled,
   
    };

    console.log("Sending payload:", payload);

    const response = await authFetch.put(
      `${PLAIN_API_URL}/appointments`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Reschedule Appointment failed");
  }
};

const GetCancelledAppointmentByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/canceled/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get Tenant All Cancelled Appointments by tenant id failed"
    );
  }
};

const GetCancelledAppointmentByStaffId = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/staff/canceled/${staffId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message || "Get Staff All Cancelled Appointments by staff id failed"
    );
  }
};

const GetRescheduleAppointmentReqByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/rescheduled/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get Tenant All Resheduled Req Appointments by tenant id failed"
    );
  }
};

const GetRescheduleAppointmentReqByStaffId = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/staff/rescheduled/${staffId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get staff All Resheduled Req Appointments by tenant id failed"
    );
  }
};

const ApproveRescheduledReq = async ({
  appointments,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/appointments/accept-reschedule`,
      appointments
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Approve Reschedule Req failed"
    );
  }
};

const RejectRescheduledReq = async ({
  appointments,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/appointments/reject-reschedule`,
      appointments
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Reject Reschedule Req failed"
    );
  }
};


const GetUpcomingAppointmentByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/upcoming/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get Tenant All Upcoming Appointments by tenant id failed"
    );
  }
};

const GetUpcomingAppointmentByStaffId = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/staff/upcoming/${staffId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get staff All Upcoming Appointments by staff id failed"
    );
  }
};


const GetPastAppointmentByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/past/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get Tenant All past Appointments by tenant id failed"
    );
  }
};

const GetPastAppointmentByStaffId = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/staff/past/${staffId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.message ||
        "Get staff All Past Appointments by staff id failed"
    );
  }
};

export default {
  CreateAppointments,
  UpdateAppointments,
  CancelAppointments,
  RescheduleAppointments,
  GetClientByTenantId,
  GetSessionTypeActiveByTenantId,
  GetTenantStaffByTenantId,
  GetAppointmentByTenantId,
  GetAppointmentByStaffId,
  GetAppointmentByClientId,
  GetCancelledAppointmentByStaffId,
  GetCancelledAppointmentByTenantId,
  GetRescheduleAppointmentReqByTenantId,
  GetRescheduleAppointmentReqByStaffId,
  ApproveRescheduledReq,
  RejectRescheduledReq,
  GetUpcomingAppointmentByTenantId,
  GetUpcomingAppointmentByStaffId,
  GetPastAppointmentByTenantId,
  GetPastAppointmentByStaffId,
};
