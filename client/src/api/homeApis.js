import AxiosInterceptor from "../Helper/AxiosInterceptor";

// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetClientSessionOverview = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/sessions/client/overview/client/${clientId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get client overview by client id failed",
    );
  }
};

const GetClientSessionChart = async ({
  clientId,
  groupBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/sessions/client/overview-chart/client/${clientId}/${groupBy}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get client overview chart by client id failed",
    );
  }
};

const GetAllAuthorizationServiceCodes = async ({
  tenantClientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-authorization/chart/${tenantClientId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get client authorization service Codes by client Tenant id failed",
    );
  }
};

const GetClientUpcomingAppointments = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/upcoming/client/${clientId}`,
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client upcoming appointments failed",
    );
  }
};
/**
 * CLIENT: one appointment by its id.
 *   GET /appointments/client/{id}
 *
 * Careful — the TENANT app uses this same URL shape to list ALL of a client's
 * appointments (`GET /appointments/client/{clientId}`). Here it returns a
 * single appointment, so the details modal shows accurate date/time/service
 * instead of relying on possibly-thin list rows.
 */
const GetAppointmentById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/appointments/client/${id}`);
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get appointment details failed",
    );
  }
};

const GetClientCompletedAppointments = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/sessions/client/client/${clientId}`,
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client completed appointments failed",
    );
  }
};

const GetClientCancelAppointments = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/canceled/client/${clientId}`,
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client canceled appointments failed",
    );
  }
};
const GetClientAwaitingApprovals = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/sessions/client/awaiting-feedback/client/${clientId}`,
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client awaiting Approval failed",
    );
  }
};
const GetClientRescheduledAppointments = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/rescheduled/client/${clientId}`,
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client rescheduled appointments failed",
    );
  }
};

const GetSingleSessionBySessionId = async ({
  sessionId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/sessions/client/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Single Session by session id failed");
  }
};

const ApproveSession = async ({
  sessionId,
  confirmDelivery,
  rateService,
  rateTherapist,
  feedback,
  signature,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      sessionId: sessionId,
      confirmDelivery: confirmDelivery,
      rateService: rateService,
      rateTherapist: rateTherapist,
      signature: signature,
    };

    // Feedback is optional, so leave the key out entirely rather than posting
    // an empty string — whitespace-only counts as nothing too.
    const trimmedFeedback =
      typeof feedback === "string" ? feedback.trim() : feedback;
    if (trimmedFeedback) payload.feedback = trimmedFeedback;

    const res = await authFetch.post(
      `${PLAIN_API_URL}/sessions-approval/client`,
      payload,
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Session approval failed");
  }
};

const RescheduleAppointments = async ({
  tenantId,
  id,
  date,
  startTime,
  endTime,
  forAll,
  reasonForReschedule,
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
      forAll,
      reasonForReschedule,
      rescheduled,
    };


    const response = await authFetch.patch(
      `${PLAIN_API_URL}/appointments/reschedule/client`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Reschedule Appointment failed");
  }
};

export default {
  GetClientSessionOverview,
  GetClientSessionChart,
  GetAllAuthorizationServiceCodes,
  GetClientUpcomingAppointments,
  GetClientRescheduledAppointments,
  GetClientCancelAppointments,
  GetClientAwaitingApprovals,
  GetSingleSessionBySessionId,
  GetAppointmentById,
  GetClientCompletedAppointments,
  ApproveSession,
  RescheduleAppointments,
};
