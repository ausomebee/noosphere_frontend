import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateProgramsDomain = async ({
  name,
  description,
  tenantId,
  domainType,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/domains`, {
      name,
      description,
      tenantId,
      domainType,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Program Domain failed"
    );
  }
};
const editProgramsDomain = async ({
  id,
  name,
  description,
  domainType,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/domains`, {
      name,
      description,
      id,
      domainType,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Edit Program Domain failed"
    );
  }
};

const GetProgramsDomainByTenantId = async ({
  tenantId,
  domainType,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/domains/${tenantId}`,
      { params: { type: domainType } }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get program domain by tenant id failed"
    );
  }
};

const deleteProgramsDomain = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
     const response = await authFetch.delete(`${PLAIN_API_URL}/domains/${id}`);
    return response;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete domain failed");
  }
};

const CreateProgramsProgram = async ({
  name,
  description,
  domainId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/programs`, {
      name,
      description,
      domainId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Programs Domain Program failed"
    );
  }
};

const editProgramsProgram = async ({
  id,
  name,
  description,
  domainId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/programs`, {
      name,
      description,
      id,
      domainId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Edit Program Domain Programs failed"
    );
  }
};

const GetProgramsProgramsByDomainId = async ({
  domainId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/programs/${domainId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get program domain by domain id failed"
    );
  }
};

const deleteProgramsProgram = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
     const response = await authFetch.delete(`${PLAIN_API_URL}/programs/${id}`);
     return response;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete program failed");
  }
};

const CreateProgramsTarget = async ({
  formData,   
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.post(`${PLAIN_API_URL}/targets`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Create target failed");
  }
};

/*  EDIT target – multipart  */
const editProgramsTarget = async ({
  formData,        // plain browser FormData instance
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.patch(`${PLAIN_API_URL}/targets`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Edit target failed");
  }
};

/*  GET targets by programId  */
const GetProgramsTargetsByProgramId = async ({
  programId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/targets/program/${programId}`);
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get targets failed");
  }
};


/*  DELETE target  */
const deleteProgramsTarget = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    await authFetch.delete(`${PLAIN_API_URL}/targets/${id}`);
  } catch (e) {
    throw new Error(e.response?.data?.message || "Delete target failed");
  }
};

const DuplicateProgramsTarget = async ({
  id,   
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.post(`${PLAIN_API_URL}/targets/duplicate/${id}`, 
    );
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "duplicate target failed");
  }
};

const GetProgramsTargetById = async ({
  Id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/targets/${Id}`);
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get single targets failed");
  }
};

const GetTargetInfoByTargetIdAndClientId = async ({
  clientId,
  targetId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/client-targets/${targetId}/client/${clientId}`);
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get single targets info failed");
  }
};

const GetBaselineDataByClientTargetId = async ({
  clientTargetId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${PLAIN_API_URL}/target-data/${clientTargetId}`);
    return res;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Get single BaseLine data failed");
  }
};

const CreateClientDataCollectionData = async ({
  clientTargetId,
  data,
   accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/target-data`, {
      clientTargetId,
      data
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Creating a Data collection data failed"
    );
  }
};


export default {
    DuplicateProgramsTarget,
  CreateProgramsDomain,
  editProgramsDomain,
  deleteProgramsDomain,
  GetProgramsDomainByTenantId,
  CreateProgramsProgram,
  editProgramsProgram,
  GetProgramsProgramsByDomainId,
  deleteProgramsProgram,
  CreateProgramsTarget,
  editProgramsTarget,
  GetProgramsTargetsByProgramId,
    GetProgramsTargetById,
  deleteProgramsTarget,
  GetBaselineDataByClientTargetId,
  GetTargetInfoByTargetIdAndClientId,
  CreateClientDataCollectionData
};
