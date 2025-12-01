
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetPipelineByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/tenant/${tenantId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get Pipeline by tenant failed");
  }
};

const CreatePipelineStage = async ({
  pipelineId,
  name,
  description,
  colourCode,
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
    
    };
    const response = await authFetch.post(`${PLAIN_API_URL}/pipeline/stage`, payload);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create Pipeline Stage failed");
  }
};

const UpdatePipelineStage = async ({ id, name, description, colourCode, accessToken, refreshToken }) => {
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
    throw new Error(error.response?.data?.message || "Update Pipeline Stage failed");
  }
};

const DeletePipelineStage = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/pipeline/stage/${id}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Delete Pipeline Stage failed");
  }
};

const DeletePipelineItem = async ({ ids, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/pipeline/multi/tenant/item`, {
      data: { ids },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Delete Pipeline Item failed");
  }
};

const GetPipelineStage = async ({ pipelineId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/stage/pipeline/${pipelineId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get Pipeline Stage failed");
  }
};

const ReorderPipelineStage = async ({ id, order, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/stage/order`, {
      id,
      order,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Reorder Pipeline Stage failed");
  }
};

const GetSinglePipelineStage = async ({ pipelineStageId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/stage/${pipelineStageId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get Single Pipeline Stage failed");
  }
};

const GetPipelineItem = async ({ stageId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/item/stage/client/${stageId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get Pipeline Stage Item failed");
  }
};

const GetSinglePipelineItem = async ({ itemId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/pipeline/item/client/${itemId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get Single Pipeline Stage Item failed");
  }
};

const UpdatePipelineItemActivity = async ({ ids, pipelineStageId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/multi/move/tenant/item`, {
      ids,
      pipelineStageId,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update Pipeline Item Activity failed");
  }
};

const CreateCandidate = async ({
  firstName,
  lastName,
  preferredName,
  email,
  phoneNumber,
  gender,
  DOB,
  primaryPayer,
  streetAddress,
  city,
  state,
  country,
  zipCode,
  tenantId,
  pipelineStageId,
  assignToClinicians,
  clientPortalAccess,
  caregiverName,
  caregiverRelationship,
  caregiverPhone,
  caregiverEmail,
  caregiverStreetAddress,
  caregiverCity,
  caregiverState,
  caregiverCountry,
  caregiverZip,
  documents,
  createdBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client`, {
      firstName,
      lastName,
      preferredName,
      email,
      phoneNumber,
      gender,
      DOB,
      primaryPayer,
      streetAddress,
      city,
      state,
      country,
      zipCode,
      tenantId,
      pipelineStageId,
      assignToClinicians,
      clientPortalAccess,
      caregiverName,
      caregiverRelationship,
      caregiverPhone,
      caregiverEmail,
      caregiverStreetAddress,
      caregiverCity,
      caregiverState,
      caregiverCountry,
      caregiverZip,
      createdBy,
      documents,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create Candidate failed");
  }
};

const UpdateCandidate = async ({
  id,
  firstName,
  lastName,
  preferredName,
  email,
  phoneNumber,
  gender,
  DOB,
  primaryPayer,
  streetAddress,
  city,
  state,
  country,
  zipCode,
  tenantId,
  pipelineStageId,
  assignToClinicians,
  clientPortalAccess,
  caregiverName,
  caregiverRelationship,
  caregiverPhone,
  caregiverEmail,
  caregiverStreetAddress,
  caregiverCity,
  caregiverState,
  caregiverCountry,
  caregiverZip,
  documents,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/client`, {
      id,
      firstName,
      lastName,
      preferredName,
      email,
      phoneNumber,
      gender,
      DOB,
      primaryPayer,
      streetAddress,
      city,
      state,
      country,
      zipCode,
      tenantId,
      pipelineStageId,
      assignToClinicians,
      clientPortalAccess,
      caregiverName,
      caregiverRelationship,
      caregiverPhone,
      caregiverEmail,
      caregiverStreetAddress,
      caregiverCity,
      caregiverState,
      caregiverCountry,
      caregiverZip,
      documents,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update Candidate failed");
  }
};

const UpdateStageTasks = async ({ pipelineStageId, tasks, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/stage/task`, {
      id: pipelineStageId,
      tasks: Array.isArray(tasks) ? tasks : [],
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update Stage Tasks failed");
  }
};

const UpdateStageDocuments = async ({ pipelineStageId, documents, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/stage/document`, {
      id: pipelineStageId,
      documents: Array.isArray(documents) ? documents : [],
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update Stage Documents failed");
  }
};

const UpdateStageDocumentsToDone = async ({ pipelineItemId, documents, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/item/document`, {
      id: pipelineItemId,
      sentDocuments: documents,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Update Stage Documents to done failed");
  }
};

const UpdateStageTasksToDone = async ({ pipelineItemId, doneTasks, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/pipeline/item/task`, {
      id: pipelineItemId,
      doneTasks,
    });
    return response;
  } catch (error) {
    console.error("API ERROR:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Update Stage Tasks to Done failed");
  }
};

const UploadDocumentForPipelineItem = async ({
  pipelineItemId,
  docName,
  files,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const formData = new FormData();
  files.forEach((file) => {
    formData.append(docName, file); // Append all files under the same docName key
  });
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/pipeline/item/document/${pipelineItemId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Upload Document for Pipeline Item failed");
  }
};

const MoveCandidateToClient = async ({
  pipelineItemId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/pipeline/client/item/${pipelineItemId}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Move Candidate to Client failed");
  }
}

export default {
  UploadDocumentForPipelineItem,
  MoveCandidateToClient,
  GetPipelineByTenantId,
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
  UpdatePipelineItemActivity,
  UpdateStageDocumentsToDone,
  UpdateStageTasksToDone,
};