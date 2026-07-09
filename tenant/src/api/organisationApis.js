import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateDiagnosisCode = async ({
  code,
  description,
  tenantId,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization/diagnosis-codes`,
      {
        code,
        description,
        tenantId,
        isActive,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Diagnosis code failed"
    );
  }
};

const UpdateDiagnosisCode = async ({
  id,
  code,
  description,
  tenantId,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization/diagnosis-codes`,
      {
        id,
        code,
        description,
        tenantId,
        isActive,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Diagnosis code failed"
    );
  }
};

const GetDiagnosisCodeByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/diagnosis-codes/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Diagnosis code by tenant id failed"
    );
  }
};

const GetSingleDiagnosisCodeById = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/diagnosis-codes/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get Single Diagnosis code by tenant id failed"
    );
  }
};

const UpdateActiveDiagnosisCode = async ({
  id,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/organization/diagnosis-codes/active/${id}/${active}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Deleting diagnosis code failed"
    );
  }
};

const CreateOrganizationSessionType = async ({
  tenantId,
  name,
  category,
  service,
  staffRolesAllowed,
  locationsAllowed,
  defaultDuration,
  isActive,
  isBillable,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization/session-types`,
      {
        tenantId,
        name,
        category,
        service,
        staffRolesAllowed,
        locationsAllowed,
        defaultDuration,
        isActive,
        isBillable,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Session Type failed"
    );
  }
};

const UpdateOrganizationSessionType = async ({
  id,
  tenantId,
  name,
  category,
  service,
  staffRolesAllowed,
  locationsAllowed,
  defaultDuration,
  isActive,
  isBillable,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization/session-types`,
      {
        id,
        tenantId,
        name,
        category,
        service,
        staffRolesAllowed,
        locationsAllowed,
        defaultDuration,
        isActive,
        isBillable,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Session Type failed"
    );
  }
};

const GetSessionTypeByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/session-types/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get session types by tenant id failed"
    );
  }
};

const GetSingleSessionTypeByTenantId = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/session-types/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get Single session types by tenant id failed"
    );
  }
};
const UpdateActiveSessionTypeByTenantId = async ({
  id,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/organization/session-types/active/${id}/${active}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get Single session types by tenant id failed"
    );
  }
};

const CreateDocument = async ({ formData, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.post(
      `${PLAIN_API_URL}/organization/document`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Create Document failed");
  }
};

const GetSingleDocumentByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/document/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Document by tenant id failed"
    );
  }
};
const GetSingleDocumentById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/document/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Document by id failed"
    );
  }
};

const DeleteDocument = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/organization/document/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Deleting document failed"
    );
  }
};

const CreateOrganizationInformation = async ({
  tenantId,
  name,
  email,
  phoneNumber,
  website,
  practiceNPI,
  streetAddress,
  city,
  state,
  country,
  zipCode,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization/information`,
      {
        tenantId,
        name,
        email,
        phoneNumber,
        website,
        practiceNPI,
        streetAddress,
        city,
        state,
        country,
        zipCode,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Organization Information failed"
    );
  }
};
const UpdateOrganizationInformation = async ({
  id,
  name,
  email,
  phoneNumber,
  website,
  practiceNPI,
  streetAddress,
  city,
  active,
  state,
  country,
  zipCode,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/tenant/organization`,
      {
        active,
        id,
        companyName: name,
        email,
        phoneNumber,
        website,
        practiceNPI,
        streetAddress,
        city,
        state,
        country,
        zipCode,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Organization Information failed"
    );
  }
};

const GetOrganizationInformationByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/tenant/${tenantId}`);
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get organization inform by tenant id failed"
    );
  }
};

const CreateOrganizationLicense = async ({
  tenantId,
  licenseName,
  licenseNumber,
  issueState,
  expiryDate,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization/license`,
      {
        tenantId,
        licenseName,
        licenseNumber,
        issueState,
        expiryDate,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Organization Licenses failed"
    );
  }
};
const UpdateOrganizationLicense = async ({
  id,
  tenantId,
  licenseName,
  licenseNumber,
  issueState,
  expiryDate,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization/license`,
      {
        id,
        tenantId,
        licenseName,
        licenseNumber,
        issueState,
        expiryDate,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Organization Licenses failed"
    );
  }
};

const GetLicenseByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/license/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get License by tenant id failed"
    );
  }
};

const GetSingleLicenseById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/license/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single License by id failed"
    );
  }
};

const DeleteLicense = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/organization/license/${id}`
    );
    return response;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete license failed");
  }
};

export default {
  CreateDiagnosisCode,
  UpdateDiagnosisCode,
  GetDiagnosisCodeByTenantId,
  GetSingleDiagnosisCodeById,
  UpdateActiveDiagnosisCode,
  CreateOrganizationSessionType,
  UpdateOrganizationSessionType,
  GetSessionTypeByTenantId,
  GetSingleSessionTypeByTenantId,
  UpdateActiveSessionTypeByTenantId,
  CreateDocument,
  GetSingleDocumentByTenantId,
  GetSingleDocumentById,
  DeleteDocument,
  CreateOrganizationInformation,
  UpdateOrganizationInformation,
  GetOrganizationInformationByTenantId,
  CreateOrganizationLicense,
  UpdateOrganizationLicense,
  GetLicenseByTenantId,
  GetSingleLicenseById,
  DeleteLicense,
};
