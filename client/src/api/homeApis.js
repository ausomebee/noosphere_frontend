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
      `${PLAIN_API_URL}/sessions/${sessionId}`,
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
    const res = await authFetch.post(`${PLAIN_API_URL}/sessions-approval`, {
      sessionId: sessionId,
      confirmDelivery: confirmDelivery,
      rateService: rateService,
      rateTherapist: rateTherapist,
      feedback: feedback,
      signature: signature,
    });
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
  GetClientCompletedAppointments,
  ApproveSession,
  RescheduleAppointments,
};
