import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

export const CreateNewFolder = async ({
  clientTenantId,
  folderName,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-folders`, {
      clientTenantId,
      name: folderName,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create new folder failed",
    );
  }
};

export const UpdateFolderName = async ({
  folderId,
  name,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/client-folders/${folderId}`,
      { name },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Rename folder failed",
    );
  }
};

export const CreateNewFile = async ({
  clientTenantId,
  name,
  url,
  size,
  fileType,
  folderId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-files`, {
      clientTenantId,
      name,
      url,
      size,
      fileType,
      // Only send folderId for files created inside a folder — a standalone
      // file must not carry a folderId at all.
      ...(folderId ? { folderId } : {}),
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create new file failed");
  }
};

const GetAllFiles = async ({ clientTenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-files/client/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get all file failed");
  }
};

const GetRecentFiles = async ({
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-files/recent/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get recent files failed");
  }
};

const GetAllFilesInFolder = async ({ folderId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-files/folder/${folderId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get files in folder failed",
    );
  }
};

export const GetAllFolders = async ({
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-folders/tenant/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get folders failed");
  }
};

const GetAllRequestDocuments = async ({
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-requested-documents/client/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get all request documents failed",
    );
  }
};

const GetCountsForDocumentRequests = async ({
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-requested-documents/count/status/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get counts for document requests failed",
    );
  }
};

const GetAllClientForms = async ({
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-forms/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get all client forms failed",
    );
  }
};

const GetFormsCounts = async ({
  clientTenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-forms/count/status/${clientTenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get client forms counts failed",
    );
  }
};

const AttachDocumentsToRequest = async ({
  clientTenantId,
  name,
  documentDetails,
  requestId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/client-documents`, {
      tenantClientId: clientTenantId,
      name: "Documents request Uploaded - " + name,
      documentDetails,
      requestId,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Attach documents to request failed",
    );
  }
};

 const GetFormWithItsFields = async ({ formId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/forms/client/${formId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get form with its fields failed"
    );
  }
};

 const CreateFormResponseField = async ({
  formId,
  tenantId,
  submittedBy,
  responseFields,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/form-responses/client`, {
      formId,
      tenantId,
      submittedBy,
      responseFields,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create form response field failed"
    );
  }
};

// Helper to convert files to base64 for API
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to prepare response payload
const PrepareResponsePayload = async (responses, files, signatures) => {
  const responseFields = [];

  // Process text responses
  Object.entries(responses).forEach(([formFieldId, value]) => {
    if (value && value.trim() !== "") {
      responseFields.push({
        formFieldId,
        value: value.trim(),
      });
    }
  });

  // Process file uploads
  for (const [formFieldId, fileList] of Object.entries(files)) {
    if (fileList && fileList.length > 0) {
      // For multiple files
      const fileData = await Promise.all(
        fileList.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            fileName: file.name,
            fileType: file.type,
            base64Data: base64.split(",")[1], // Remove data URL prefix
          };
        })
      );
      
      responseFields.push({
        formFieldId,
        value: JSON.stringify(fileData),
      });
    }
  }

  // Process signatures
  Object.entries(signatures).forEach(([formFieldId, signature]) => {
    if (signature) {
      if (signature.startsWith("data:image")) {
        // It's a drawn/image signature
        responseFields.push({
          formFieldId,
          value: signature,
        });
      } else {
        // It's typed signature
        responseFields.push({
          formFieldId,
          value: signature,
        });
      }
    }
  });

  return responseFields;
};

export default {
  CreateNewFolder,
  UpdateFolderName,
  CreateNewFile,
  GetRecentFiles,
  GetAllFilesInFolder,
  GetAllFiles,
  GetAllFolders,
  GetAllRequestDocuments,
  GetCountsForDocumentRequests,
  GetAllClientForms,
  GetFormsCounts,
  AttachDocumentsToRequest,
  GetFormWithItsFields,
  CreateFormResponseField,
  PrepareResponsePayload
};
