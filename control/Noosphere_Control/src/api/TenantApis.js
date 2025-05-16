import axios from "axios";
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
      `${PLAIN_API_URL}/pipeline/module/${modules}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Pipeline by module failed"
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

const CreatePipelineStage = async ({
  pipelineId,
  name,
  description,
  colourCode,
  tasks = [],
  documents = [],
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  console.log("TenantApis.CreatePipelineStage input:", {
    pipelineId,
    name,
    description,
    colourCode,
    tasks,
    documents,
  });

  try {
    const payload = {
      pipelineId,
      name,
      description,
      colourCode,
      tasks: Array.isArray(tasks) ? tasks : [],
      documents: Array.isArray(documents) ? documents : [],
    };

    console.log("TenantApis.CreatePipelineStage payload:", payload);

    const response = await authFetch.post(
      `${PLAIN_API_URL}/pipeline/stage`,
      payload
    );

    console.log("TenantApis.CreatePipelineStage response:", response.data);

    return response;
  } catch (error) {
    console.error("TenantApis.CreatePipelineStage error:", error);
    throw new Error(
      error.response?.data?.message || "Create Pipeline Stage failed"
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
      error.response?.data?.message || "Update Pipeline Stage failed"
    );
  }
};
const DeletePipelineStage = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/pipeline/stage/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Delete Pipeline Stage failed"
    );
  }
};
const DeletePipelineItem = async ({ ids, accessToken, refreshToken }) => {
    const authFetch = AxiosInterceptor(accessToken, refreshToken);
    try {
      const response = await authFetch.delete(
        `${PLAIN_API_URL}/pipeline/multi/tenant/item`,
        { data: { ids } } 
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Delete Pipeline Item failed"
      );
    }
  };

const GetPipelineStage = async ({ pipelineId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/stage/pipeline/${pipelineId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Pipeline Stage failed"
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Reorder Pipeline Stage failed"
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
      `${PLAIN_API_URL}/pipeline/stage/${pipelineStageId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Pipeline Stage failed"
    );
  }
};
const GetPipelineItem = async ({ stageId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/item/stage/tenant/${stageId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Pipeline Stage Item failed"
    );
  }
};

const GetSinglePipelineItem = async ({ itemId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/item/${itemId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Single Pipeline Stage Item failed"
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Pipeline Item Activity failed"
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Reassign Candidate to Staff failed"
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
      pipelineStageId,
      assignToAdmin,
      createdBy,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Pipeline Stage failed"
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
      pipelineStageId,
      assignToAdmin,
      createdBy,
      id,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Pipeline Stage failed"
    );
  }
};

const UpdateStageTasks = async ({
  pipelineStageId,
  tasks,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/stage/task`,
      {
        id: pipelineStageId,
        tasks: Array.isArray(tasks) ? tasks : [],
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Stage Tasks failed"
    );
  }
};

const UpdateStageDocuments = async ({
  pipelineStageId,
  documents,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/pipeline/stage/document`,
      {
        id: pipelineStageId,
        documents: Array.isArray(documents) ? documents : [],
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Stage Documents failed"
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Stage Documents to done failed"
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
      }
    );
    return response;
  } catch (error) {
    console.error("API ERROR:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Update Stage Tasks to Done failed"
    );
  }
};

export default {
  getAllAdmins,
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
};
