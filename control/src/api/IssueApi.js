import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetIssueById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/issue/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to Issue by Id");
  }
};

const GetResolutionTime = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/resolution/time`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch resolution time"
    );
  }
};

const GetMetricAndStatusCount = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/issue/count/status`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch metrics and counts"
    );
  }
};
const GetStatusPercentageAndCount = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/percent/status`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch status percentage and count"
    );
  }
};
const GetCategoryPercentageAndCount = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/percent/category`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch category percentage and count"
    );
  }
};
const GetDateCreatedPercentageAndCount = async ({
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/issue/percent/time`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch date created percentage and count"
    );
  }
};
const GetAssigneePercentageAndCount = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/percent/assignee`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch date created percentage and count"
    );
  }
};
const GetPriorityPercentageAndCount = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/percent/priority`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch priority percentage and count"
    );
  }
};

const GetIssuesByStatus = async ({ status, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${import.meta.env.VITE_API_URL}/issue/status/${status}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch issues");
  }
};
const CreateIssue = async ({ accessToken, refreshToken, payload }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${import.meta.env.VITE_API_URL}/issue`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create issue");
  }
};

const CreateCommentOnIssue = async ({
  issueId,
  comment,
  adminId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${import.meta.env.VITE_API_URL}/issue/comment/new`,

      {
        issueId,
        comment,
        adminId,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to create comment"
    );
  }
};
const EditIssue = async ({
  issueId,
  title,
  updatedBy,
  description,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/edit`,

      {
        id: issueId,
        title,
        updatedBy,
        description,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to Edit Issue");
  }
};
const ChangeCategory = async ({
  issueId,
  category,
  updatedBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/change-category`,

      {
        id: issueId,
        category,
        updatedBy,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to Edit category");
  }
};
const ChangePriority = async ({
  issueId,
  priority,
  updatedBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/change-priority`,

      {
        id: issueId,
        priority,
        updatedBy,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to Edit priority");
  }
};
const ReassignToStaff = async ({
  issueId,
  adminId,
  updatedBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/reassign`,

      {
        id: issueId,
        adminId,
        updatedBy,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to reassign to staff"
    );
  }
};
const ChangeIssueStatus = async ({
  issueId,
  status,
  updatedBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/change-status`,

      {
        id: issueId,
        status,
        updatedBy,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to change status");
  }
};
const AddAttachment = async ({ payload, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/attachment`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to add attachment");
  }
};
const MarkAsResolved = async ({ payload, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${import.meta.env.VITE_API_URL}/issue/issue/ressolved`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to add attachment");
  }
};
const GetTenantManagementOverview = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/tenant-management-overview/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch tenant management overview"
    );
  }
};

const GetTenantIssuesByStatus = async ({ tenantId, status, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/tenant/${tenantId}/status/${status}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch tenant issues by status"
    );
  }
};

const ContactTenantByMail = async ({ payload, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${import.meta.env.VITE_API_URL}/tenant/contact`,
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to contact tenant by mail");
  }
};

export default {
  GetIssueById,
  GetResolutionTime,
  GetMetricAndStatusCount,
  GetStatusPercentageAndCount,
  GetCategoryPercentageAndCount,
  GetDateCreatedPercentageAndCount,
  GetAssigneePercentageAndCount,
  GetPriorityPercentageAndCount,
  CreateIssue,
  GetIssuesByStatus,
  CreateCommentOnIssue,
  EditIssue,
  ChangeCategory,
  ChangePriority,
  ReassignToStaff,
  ChangeIssueStatus,
  ContactTenantByMail,
  AddAttachment,
  MarkAsResolved,
  GetTenantManagementOverview,
  GetTenantIssuesByStatus,
};
