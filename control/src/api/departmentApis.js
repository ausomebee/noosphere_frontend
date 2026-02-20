import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetAllDepartments = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/organization/departments`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch departments");
  }
};

const CreateDepartment = async ({ name, createdByAdminId, teamLeadId, members, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/organization/departments`, {
      name,
      createdByAdminId,
      teamLeadId,
      members,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create department");
  }
};

const UpdateDepartment = async ({ id, name, createdByAdminId, teamLeadId, members, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/organization/departments`, {
      id,
      name,
      createdByAdminId,
      teamLeadId,
      members,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update department");
  }
};

const DeleteDepartment = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/organization/departments/${id}/delete`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete department");
  }
};

const ToggleDepartmentActive = async ({ id, active, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/organization/departments/${id}/active/${active}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update department status");
  }
};

const GetAllAdmins = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/admin`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch admins");
  }
};

export default {
  GetAllDepartments,
  CreateDepartment,
  UpdateDepartment,
  DeleteDepartment,
  ToggleDepartmentActive,
  GetAllAdmins,
};
