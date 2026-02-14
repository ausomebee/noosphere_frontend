import AxiosInterceptor from "../Helper/AxiosInterceptor";

// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;


const GetClientProgramsAndTargets = async ({
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-programs/target/${clientId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get client programs and targets failed"
    );
  }
};

const GetClientTargetPerformance = async ({
  clientId,
  targetId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/sessions/performance/${targetId}/${clientId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get client target performance failed"
    );
  }
};

export default {
  GetClientProgramsAndTargets,
  GetClientTargetPerformance,
};