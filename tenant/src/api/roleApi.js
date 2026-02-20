import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateRole = async ({
  name,
  dataAccessLevel,
  createdByTenantId,
  moduleAccesses,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/role/`, {
      name,
      dataAccessLevel,
      systemModule: "TENANT",
      createdByTenantId,
      moduleAccesses,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create role failed");
  }
};

const GetAllRolesByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/role/module/TENANT/${tenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get roles failed");
  }
};

const GetSingleRole = async ({ roleId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/role/${roleId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get role failed");
  }
};

const UpdateRole = async ({
  id,
  name,
  dataAccessLevel,
  moduleAccesses,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/role`, {
      id,
      name,
      dataAccessLevel,
      systemModule: "TENANT",
      moduleAccesses,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update role failed");
  }
};

const DeactivateRole = async ({ roleId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/role/deactivate/${roleId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Deactivate role failed");
  }
};

export default {
  CreateRole,
  GetAllRolesByTenantId,
  GetSingleRole,
  UpdateRole,
  DeactivateRole,
};
