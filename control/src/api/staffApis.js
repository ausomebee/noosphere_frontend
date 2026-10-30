import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetAllAdmins = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/admin`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch staff");
  }
};

const GetAdmin = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/admin/getadmin/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch admin");
  }
};

const CreateAdmin = async ({ firstName, lastName, email, phoneNumber, roleId, departmentId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/admin/createadmin`, {
      firstName,
      lastName,
      email,
      phoneNumber,
      roleId,
      departmentId,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create staff");
  }
};

const UpdateAdmin = async ({ id, firstName, lastName, email, phoneNumber, roleId, departmentId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/admin/updateadmin`, {
      id,
      firstName,
      lastName,
      email,
      phoneNumber,
      roleId,
      departmentId,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update staff");
  }
};

const ToggleAdminActive = async ({ id, active, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/admin/setactivestatus/${id}/active/${active}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update staff status");
  }
};

const GetAllRoles = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/role`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch roles");
  }
};

export default {
  GetAllAdmins,
  GetAdmin,
  CreateAdmin,
  UpdateAdmin,
  ToggleAdminActive,
  GetAllRoles,
};
