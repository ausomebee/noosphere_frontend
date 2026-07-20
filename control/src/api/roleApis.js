import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateRole = async ({
  name,
  dataAccessLevel,
  createdByAdminId,
  moduleAccesses = [],
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/role`, {
      name,
      dataAccessLevel,
      systemModule: "ADMIN",
      createdByAdminId,
      moduleAccesses,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Role creation failed");
  }
};

const UpdateRole = async ({
  id,
  name,
  dataAccessLevel,
  moduleAccesses = [],
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/role`, {
      id,
      name,
      dataAccessLevel,
      moduleAccesses,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Role update failed");
  }
};

const GetRolesByModule = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/role/module/ADMIN`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch roles");
  }
};

const GetRoleById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/role/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch role");
  }
};

const DeactivateRole = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/role/deactivate/${id}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Role deactivation failed"
    );
  }
};

const ActivateRole = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/role/activate/${id}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Role activation failed"
    );
  }
};

export default {
  CreateRole,
  UpdateRole,
  GetRolesByModule,
  GetRoleById,
  DeactivateRole,
  ActivateRole,
};
