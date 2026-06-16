import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetAllTenantsClient = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client/tenant/tenant/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get all tenant client by tenant id failed"
    );
  }
};

const UpdateActiveClient = async ({
  clientTenantId,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/client/${clientTenantId}/${active}`
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Deleting client failed");
  }
};

const GetSingleClientByClientId = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client/client/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get single client by id failed"
    );
  }
};

const UpdateClientPortalAccess = async ({
  clientTenantId,
  documentAccess,
  dbAccess,
  requestAppointment,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/client/portal-access`,
      {
        clientTenantId,
        documentAccess,
        dbAccess,
        requestAppointment,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "client Portal Access update failed"
    );
  }
};
const CreateClientDocuments = async ({
  createdBy,
  tenantClientId,
  name,
  documentDetails,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-documents`, {
      createdBy,
      tenantClientId,
      name,
      documentDetails,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "create client document failed"
    );
  }
};
const UpdateClientDocuments = async ({
  id,
  name,
  documentDetails,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/client-documents`, {
      id,
      name,
      documentDetails,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update client document failed"
    );
  }
};
const GetAllClientDocument = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-documents/client/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get  all client documents by id failed"
    );
  }
};

const CreateClientDocumentsRequest = async ({
  tenantClientId,
  name,
  description,
  allowMultiple,
  dueDate,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/client-requested-documents`,
      {
        tenantClientId,
        name,
        description,
        allowMultiple,
        dueDate,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "create client document failed"
    );
  }
};
const GetAllClientDocumentRequested = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-requested-documents/client/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get  all client documents by id failed"
    );
  }
};
// Program
const GetProgramsByTenantId = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/programs/tenant/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get  all tenants program by id failed"
    );
  }
};

const GetClientsProgramByClientId = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-programs/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get  client program by id failed"
    );
  }
};

const AttachProgramToClient = async ({
  clientId,
  programId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-programs`, {
      programId,
      clientId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Attach client program failed"
    );
  }
};
const CreateClientsProgram = async ({
  name,
  description,
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/programs/custom`, {
      name,
      description,
      clientId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create client program failed"
    );
  }
};
const EditClientsProgram = async ({
  id,
  name,
  description,
  clientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/programs`, {
      id,
      name,
      description,
      clientId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Edit client program failed"
    );
  }
};

const deleteClientsProgram = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/programs/${id}`);
    return response;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete program failed");
  }
};

const GetProgramsTargetsByProgramId = async ({
  programId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/targets/program/${programId}`
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get targets failed");
  }
};

/*  DELETE target  */
const deleteProgramsTarget = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    await authFetch.delete(`${PLAIN_API_URL}/targets/${id}`);
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete target failed");
  }
};

const GetProgramsTargetById = async ({ Id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/targets/${Id}`);
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get single targets failed");
  }
};

const GetAllTargetByTenantId = async ({ Id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/targets/tenant/${Id}`);
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get all targets failed");
  }
};

const CreateProgramsTargetByClientId = async ({
  clientId,
  formData,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
 formData.append("clientId", String(clientId));

  try {
    const res = await authFetch.post(
      `${PLAIN_API_URL}/targets/custom`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Create target failed");
  }
};

/*  EDIT target – multipart  */
const editProgramsTargetByClientId = async ({
  formData,
  programId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  formData.append("programId", programId);
  try {
    const res = await authFetch.patch(`${PLAIN_API_URL}/targets`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Edit target failed");
  }
};
const AttachTargetToClient = async ({
  clientId,
  targetId,
  programId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-targets`, {
      programId,
      targetId,
      clientId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Attach client target failed"
    );
  }
};

const CreateClientAuthorization = async ({
  tenantClientId,
  title,
  authorizationNumber,
  startDate,
  endDate,
  payer,
  insuranceType,
  serviceCodes,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/client-authorization`,
      {
        tenantClientId,
        title,
        authorizationNumber,
        startDate,
        endDate,
        payer,
        insuranceType,
        serviceCodes,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create client authorization failed"
    );
  }
};
const UpdateClientAuthorization = async ({
  id,
  title,
  authorizationNumber,
  startDate,
  endDate,
  payer,
  insuranceType,
  serviceCodes,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/client-authorization/${id}`,
      {
        title,
        authorizationNumber,
        startDate,
        endDate,
        payer,
        insuranceType,
        serviceCodes,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update client authorization failed"
    );
  }
};

const GetAllClientAuthorizationByTenantClientId = async ({
  tenantClientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/client-authorization/tenant-client/${tenantClientId}`
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get all client Authorization failed"
    );
  }
};
const GetSingleClientAuthorizationById = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/client-authorization/single/${id}`
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get single client Authorization failed"
    );
  }
};

// PATCH /client-authorization/{id}/{active}  — true to activate, false to deactivate
const SetClientAuthorizationActive = async ({ id, active, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.patch(
      `${PLAIN_API_URL}/client-authorization/${id}/${active}`
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Set authorization active failed");
  }
};

// PATCH /client-authorization/delete/{id}/{delete}  — true to soft-delete
const SoftDeleteClientAuthorization = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.patch(
      `${PLAIN_API_URL}/client-authorization/delete/${id}/true`
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete authorization failed");
  }
};

const GetClientUpcomingAppointments = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/upcoming/${id}`
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client upcoming appointments failed"
    );
  }
};
const GetClientPastAppointments = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/past/${id}`
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client past appointments failed"
    );
  }
};
const GetClientCancelAppointments = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/canceled/${id}`
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get Client canceled appointments failed"
    );
  }
};

const deleteClientsDocument = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/client-documents/${id}`
    );
    return response;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Delete client documents failed"
    );
  }
};

const AttachFormToClient = async ({
  tenantClientId,
  formId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-forms`, {
      tenantClientId,
      formId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Attach forms failed"
    );
  }
};

const GetAllFormsByTenantClientId = async ({
  tenantClientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(
      `${PLAIN_API_URL}/client-forms/${tenantClientId}`
    );
    return res;
  } catch (e) {
    throw new Error(
      e.response?.data?.message || "Get all client Forms failed"
    );
  }
};
export default {
  GetAllTenantsClient,
  UpdateActiveClient,
  GetSingleClientByClientId,
  UpdateClientPortalAccess,
  CreateClientDocuments,
  UpdateClientDocuments,
  GetAllClientDocument,
  CreateClientDocumentsRequest,
  GetAllClientDocumentRequested,
  deleteClientsDocument,
  AttachFormToClient,
  GetAllFormsByTenantClientId,

  GetClientsProgramByClientId,
  CreateClientsProgram,
  EditClientsProgram,
  GetProgramsByTenantId,
  deleteClientsProgram,
  AttachProgramToClient,
  GetProgramsTargetsByProgramId,
  deleteProgramsTarget,
  GetProgramsTargetById,
  GetAllTargetByTenantId,
  CreateProgramsTargetByClientId,
  editProgramsTargetByClientId,
  AttachTargetToClient,
  CreateClientAuthorization,
  GetAllClientAuthorizationByTenantClientId,
  UpdateClientAuthorization,
  GetSingleClientAuthorizationById,
  SetClientAuthorizationActive,
  SoftDeleteClientAuthorization,
  GetClientUpcomingAppointments,
  GetClientPastAppointments,
  GetClientCancelAppointments,
};
