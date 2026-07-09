// TemplateAndReportApi.js
import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// Template Endpoints
const CreateClinicalReportTemplate = async ({
  tenantId,
  title,
  sections,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      title,
      sections,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-report-templates`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Clinical report templates failed");
  }
};

const UpdateClinicalReportTemplate = async ({
  id,
  isDraft,
  tenantId,
  title,
  sections,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      title,
      sections,
      id,
      isDraft,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/clinical-report-templates`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "update Clinical report templates failed");
  }
};

const GetClinicalReportTemplateByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-report-templates/tenant/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Get Clinical Report Template by tenantId failed",
    );
  }
};

const GetSingleClinicalReportTemplateById = async ({
  Id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-report-templates/${Id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Get Single Clinical Report Template by id failed",
    );
  }
};

const DuplicateClinicalReportTemplate = async ({
  Id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-report-templates/duplicate/${Id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Duplicate Clinical Report Template failed",
    );
  }
};

const DeleteClinicalReportTemplate = async ({
  Id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/clinical-report-templates/${Id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Delete Clinical Report Template failed");
  }
};

// Report Endpoints
const CreateClinicalReport = async ({
  tenantId,
  clientTenantId,
  creatorId,
  approverId,
  title,
  status, //draft and publish
  sections,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      status,
      tenantId,
      title,
      sections,
      clientTenantId,
      creatorId,
      approverId,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-reports`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Clinical report failed");
  }
};

const UpdateClinicalReport = async ({
  id,
  clientTenantId,
  approverId,
  title,
  status, //draft and publish
  sections,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      status,
      title,
      sections,
      clientTenantId,
      approverId,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/clinical-reports`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Clinical report failed");
  }
};

const GetSingleClinicalReportById = async ({
  Id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-reports/${Id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Single Clinical Report by id failed");
  }
};

const GeClinicalReportByTenantIdAndStatus = async ({
  clientTenantId,
  status,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-reports/client/${clientTenantId}/status/${status}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Get Clinical Report by tenantId and status failed",
    );
  }
};

const GetClinicalReportByApproverId = async ({
  approverId,
  accessToken,
  clientTenantId,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-reports/approver/${approverId}/client/${clientTenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Clinical Report Approver failed");
  }
};

const DeleteClinicalReport = async ({ Id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/clinical-reports/${Id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Delete Clinical Report failed");
  }
};

const DuplicateClinicalReport = async ({ Id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-reports/duplicate/${Id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Duplicate Clinical Report failed");
  }
};

const GetClinicalReportAuditTrails = async ({
  reportId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-report-histories/report/${reportId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Clinical Report Audit Trails failed");
  }
};
const GetAllClinicalReportChangeRequests = async ({
  reportId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-report-change-requests/report/${reportId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Get Clinical Report Change Requests failed",
    );
  }
};

const UpdateClinicalReportStatus = async ({
  reportId,
  status,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/clinical-reports/${reportId}/status/${status}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Clinical Report Status failed");
  }
};

const CreateClinicalReportChangeRequest = async ({
  clinicalReportId,
  description,
  approverId,
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = { clinicalReportId, description };
    if (approverId) payload.approverId = approverId;
    if (clientTenantId) payload.clientTenantId = clientTenantId;

    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-report-change-requests`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Create Clinical report change requests failed",
    );
  }
};


const GetClinicalReportChangeRequests = async ({
  clinicalReportId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-report-change-requests/report/${clinicalReportId}`,
    );
    return response.data;
  }
    catch (error) {
    throw new Error(
      error.message || "Get Clinical report change requests failed",
    );  
  }
};

const GetClinicalReportChangeRequestById = async ({
  changeRequestId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/clinical-report-change-requests/${changeRequestId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Clinical Report Change Request By Id failed");
  }
};


const WithdrawClientClinicalReport = async ({
  clinicalReportId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/clinical-reports/${clinicalReportId}/withdraw-token`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Withdraw Clinical Report failed");
  }
};

const NudgeClientForReport = async ({
  clinicalReportId,
  accessToken,
  refreshToken,}) => {
   const authFetch = AxiosInterceptor(accessToken, refreshToken);
    try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-reports/${clinicalReportId}/nudge`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Nudge client for report failed");
  }
};

const ApproveClinicalReport = async ({
  clinicalReportId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/clinical-reports/approve/${clinicalReportId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Approve Clinical Report failed");
  }
};

const ValidateClientReportToken = async ({ token }) => {
  const authFetch = AxiosInterceptor(token, token);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/clinical-reports/validate/${token}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Token validation failed");
  }
};

const SignClinicalReport = async ({ id, content }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/clinical-reports/submit-signature`,
      { id, content },
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Sign Clinical Report failed");
  }
};

const ResubmitClinicalReport = async ({
  clinicalReportId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/clinical-reports/resubmit/${clinicalReportId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Resubmit Clinical Report failed");
  }
};

export default {
  CreateClinicalReportTemplate,
  UpdateClinicalReportTemplate,
  GetClinicalReportTemplateByTenantId,
  GetSingleClinicalReportTemplateById,
  DuplicateClinicalReportTemplate,
  DeleteClinicalReportTemplate,
  CreateClinicalReport,
  UpdateClinicalReport,
  GeClinicalReportByTenantIdAndStatus,
  GetClinicalReportByApproverId,
  GetSingleClinicalReportById,
  DeleteClinicalReport,
  DuplicateClinicalReport,
  UpdateClinicalReportStatus,
  CreateClinicalReportChangeRequest,
  GetAllClinicalReportChangeRequests,
  GetClinicalReportAuditTrails,
  GetClinicalReportChangeRequests,
  GetClinicalReportChangeRequestById,
  WithdrawClientClinicalReport,
  NudgeClientForReport,
  ApproveClinicalReport,
  ValidateClientReportToken,
  SignClinicalReport,
  ResubmitClinicalReport,
};
