import AxiosInterceptor from "../Helper/AxiosInterceptor";

// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetPipelineByModule = async ({
  modules = "TENANT",
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/module/${modules}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Pipeline by module failed",
    );
  }
};

const getAllAdmins = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/admin`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get All Admins failed");
  }
};

const getAllTenants = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get All Tenants failed");
  }
};

const CreatePipelineStage = async ({
  pipelineId,
  name,
  description,
  colourCode,
  requiredTasks = [],
  requiredDocuments = [],
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const payload = {
      pipelineId,
      name,
      description,
      colourCode,
      requiredTasks: Array.isArray(requiredTasks) ? requiredTasks : [],
      requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : [],
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/pipeline/stage`,
      payload,
    );

    return response;
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("TenantApis.CreatePipelineStage error:", error);
    throw new Error(
      error.response?.data?.message || "Create Pipeline Stage failed",
    );
  }
};

const UpdatePipelineStage = async ({
  id,
  name,
  description,
  colourCode,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/stage`, {
      id,
      name,
      description,
      colourCode,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Pipeline Stage failed",
    );
  }
};
const DeletePipelineStage = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/pipeline/stage/${id}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Delete Pipeline Stage failed",
    );
  }
};
const DeletePipelineItem = async ({ ids, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/pipeline/multi/tenant/item`,
      { data: { ids } },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Delete Pipeline Item failed",
    );
  }
};

const GetPipelineStage = async ({ pipelineId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/stage/pipeline/${pipelineId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Pipeline Stage failed",
    );
  }
};
const ReorderPipelineStage = async ({
  id,
  order,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/stage/order`,
      {
        id,
        order,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Reorder Pipeline Stage failed",
    );
  }
};
const GetSinglePipelineStage = async ({
  pipelineStageId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/stage/${pipelineStageId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Pipeline Stage failed",
    );
  }
};
const GetPipelineItem = async ({ stageId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/item/stage/tenant/${stageId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Pipeline Stage Item failed",
    );
  }
};

const GetSinglePipelineItem = async ({ itemId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/item/${itemId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Pipeline Stage Item failed",
    );
  }
};

const UpdatePipelineItemActivity = async ({
  ids,
  pipelineStageId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/multi/move/tenant/item`,
      {
        ids,
        pipelineStageId,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Pipeline Item Activity failed",
    );
  }
};

const ReassignCandidateToStaff = async ({
  ids,
  assignToAdmin,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/multi/assign/tenant/item`,
      {
        ids,
        assignToAdmin,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Reassign Candidate to Staff failed",
    );
  }
};

const CreateCandidate = async ({
  fullName,
  email,
  phoneNumber,
  stage,
  companyName,
  contactPerson,
  companySize,
  organizationType,
  location,
  leadSource,
  subdomain,
  pipelineStageId,
  assignToAdmin,
  accessToken,
  refreshToken,
  createdBy,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/tenant/candidate`, {
      fullName,
      email,
      phoneNumber,
      stage,
      companyName,
      contactPerson,
      companySize,
      organizationType,
      location,
      leadSource,
      subdomain,
      pipelineStageId,
      assignToAdmin,
      createdBy,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Pipeline Stage failed",
    );
  }
};
const UpdateCandidate = async ({
  fullName,
  email,
  phoneNumber,
  stage,
  companyName,
  contactPerson,
  companySize,
  organizationType,
  location,
  leadSource,
  pipelineStageId,
  assignToAdmin,
  subdomain,
  accessToken,
  refreshToken,
  createdBy,
  id,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/tenant`, {
      fullName,
      email,
      phoneNumber,
      stage,
      companyName,
      contactPerson,
      companySize,
      organizationType,
      location,
      leadSource,
      subdomain,
      pipelineStageId,
      assignToAdmin,
      createdBy,
      id,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Pipeline Stage failed",
    );
  }
};

const UpdateStageTasks = async ({
  pipelineStageId,
  requiredTasks,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/stage/task`,
      {
        id: pipelineStageId,
        requiredTasks: Array.isArray(requiredTasks) ? requiredTasks : [],
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Stage Tasks failed",
    );
  }
};

const UpdateStageDocuments = async ({
  pipelineStageId,
  requiredDocuments,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/stage/document`,
      {
        id: pipelineStageId,
        requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : [],
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Stage Documents failed",
    );
  }
};
const UpdateStageDocumentsToDone = async ({
  pipelineItemId,
  documents,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/item/document`,
      {
        id: pipelineItemId,
        sentDocuments: documents,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Stage Documents to done failed",
    );
  }
};

const UpdateStageTasksToDone = async ({
  pipelineItemId,
  doneTasks,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/item/task`,
      {
        id: pipelineItemId,
        doneTasks, // this should be an object
      },
    );
    return response;
  } catch (error) {
    if (import.meta.env.DEV)
      console.error("API ERROR:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Update Stage Tasks to Done failed",
    );
  }
};

const GetTenantCount = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/count`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get Tenant Count failed");
  }
};

const GetManagementOverview = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant/management-overview`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Management Overview failed",
    );
  }
};

const GetActiveTenants = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/active`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Active Tenants failed",
    );
  }
};

const DeactivateTenant = async ({
  id,
  active,
  deactivatedById,
  password,
  reason,
  details,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/tenant/active-status`,
      {
        id,
        active,
        deactivatedById,
        password,
        reason,
        details,
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Deactivate Tenant failed",
    );
  }
};

const UpdateTenantInfo = async ({ payload, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/tenant`, payload);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Tenant Info failed",
    );
  }
};

const GetSingleTenant = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/${tenantId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Tenant failed",
    );
  }
};

const ChangeAdminPassword = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/tenant/change-admin-password/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Change Admin Password failed",
    );
  }
};

const ChangeTenantEmail = async ({
  tenantId,
  email,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/tenant/change-email/${tenantId}`,
      { email },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Change Tenant Email failed",
    );
  }
};

const ChangeTenantPhoneNumber = async ({
  tenantId,
  phoneNumber,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/tenant/change-phone-number/${tenantId}`,
      { phoneNumber },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Change Tenant Phone Number failed",
    );
  }
};

const ChangeAccountOfficer = async ({
  tenantId,
  adminId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/tenant/account-officer/${tenantId}/${adminId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Change Account Officer failed",
    );
  }
};

const GetTenantActivityLog = async ({
  accessToken,
  refreshToken,
  tenantId,
  page,
  limit,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/logs/tenant/activity?tenantId=${tenantId}&page=${page}&limit=${limit}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Activity Log failed",
    );
  }
};
const GetTenantFeatures = async ({ accessToken, refreshToken, tenantId }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/subscription/tenant/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Features failed",
    );
  }
};
const GetTenantUsageStatistics = async ({
  accessToken,
  refreshToken,
  tenantId,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant/usage-statistics-overview/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Usage Statistics failed",
    );
  }
};

const GetTenantServerRequest = async ({
  accessToken,
  refreshToken,
  tenantId,
  page,
  limit,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/server-requests/tenant/activity?tenantId=${tenantId}&page=${page}&limit=${limit}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Server Request failed",
    );
  }
};


const GetTenantInvoices = async ({ accessToken, refreshToken, tenantId }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/tenants/${tenantId}/invoices`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Invoices failed",
    );
  }
};
const GetTenantInvoicesByStatus = async ({ accessToken, refreshToken, tenantId, status }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/tenants/${tenantId}/invoices/status/${status}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Invoices failed",
    );
  }
};
const GetTenantPayments = async ({ accessToken, refreshToken, tenantId }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/tenants/${tenantId}/payments`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Payments failed",
    );
  }
};
const GetTenantPaymentsByStatus = async ({ accessToken, refreshToken, tenantId, status }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/tenants/${tenantId}/payments/status/${status}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Payments By Status failed",
    );
  }
};

const GetTenantFeatureActivityLogs = async ({ accessToken, refreshToken, tenantId, page = 1, limit = 20 }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/logs/tenant/feature/activity?tenantId=${tenantId}&page=${page}&limit=${limit}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Feature Activity Logs failed",
    );
  }
};

const GetTenantPaymentMethods = async ({ accessToken, refreshToken, tenantId }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/payment-methods/tenant/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Payment Methods failed",
    );
  }
};



// --- Custom Tasks (per pipeline item) ---

const CreateCustomTask = async ({ pipelineItemId, taskName, isRequired, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/pipeline/item/custom/task`, {
      pipelineItemId,
      taskName,
      isRequired,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create custom task failed");
  }
};

const GetCustomTasks = async ({ pipelineItemId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/item/${pipelineItemId}/custom/tasks`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get custom tasks failed");
  }
};

const UpdateCustomTask = async ({ id, taskName, isRequired, isCompleted, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/item/custom/task`, {
      id,
      taskName,
      isRequired,
      isCompleted,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update custom task failed");
  }
};

const DeleteCustomTask = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/pipeline/item/custom/task/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Delete custom task failed");
  }
};

// --- Custom Documents (per pipeline item) ---

const CreateCustomDocument = async ({ pipelineItemId, documentName, isRequired, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/pipeline/item/custom/document`, {
      pipelineItemId,
      documentName,
      isRequired,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create custom document failed");
  }
};

const GetCustomDocuments = async ({ pipelineItemId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/item/${pipelineItemId}/custom/documents`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get custom documents failed");
  }
};

const UpdateCustomDocument = async ({ id, documentName, isRequired, isCompleted, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/item/custom/document`, {
      id,
      documentName,
      isRequired,
      isCompleted,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update custom document failed");
  }
};

const DeleteCustomDocument = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/pipeline/item/custom/document/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Delete custom document failed");
  }
};

// DUMMY ENDPOINT — placeholder for sending an email to a prospect.
// Swap the URL for the real backend route once it exists.
const SendProspectEmail = async ({ to, subject, body, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/prospect/send-email`, {
      to,
      subject,
      body,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Send prospect email failed");
  }
};

export default {
  SendProspectEmail,
  getAllAdmins,
  getAllTenants,
  GetPipelineByModule,
  UpdatePipelineStage,
  CreatePipelineStage,
  GetPipelineStage,
  DeletePipelineItem,
  DeletePipelineStage,
  GetSinglePipelineStage,
  GetPipelineItem,
  GetSinglePipelineItem,
  CreateCandidate,
  UpdateCandidate,
  ReorderPipelineStage,
  UpdateStageTasks,
  UpdateStageDocuments,
  ReassignCandidateToStaff,
  UpdatePipelineItemActivity,
  UpdateStageDocumentsToDone,
  UpdateStageTasksToDone,
  GetTenantCount,
  GetManagementOverview,
  GetActiveTenants,
  DeactivateTenant,
  UpdateTenantInfo,
  ChangeAccountOfficer,
  GetSingleTenant,
  ChangeAdminPassword,
  ChangeTenantEmail,
  ChangeTenantPhoneNumber,
  GetTenantActivityLog,
  GetTenantFeatures,
  GetTenantUsageStatistics,
  GetTenantServerRequest,
  GetTenantInvoices,
  GetTenantInvoicesByStatus,
  GetTenantPayments,
  GetTenantPaymentsByStatus,
  GetTenantPaymentMethods,
  GetTenantFeatureActivityLogs,
  CreateCustomTask,
  GetCustomTasks,
  UpdateCustomTask,
  DeleteCustomTask,
  CreateCustomDocument,
  GetCustomDocuments,
  UpdateCustomDocument,
  DeleteCustomDocument,
};
