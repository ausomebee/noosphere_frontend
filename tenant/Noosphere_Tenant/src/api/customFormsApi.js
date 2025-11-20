import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateCustomForm = async ({
  tenantId,
  name,
  isDraft,
  isTemplate,
  formFields,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      name,
      isDraft,
      isTemplate,
      formFields,
    };

    const response = await authFetch.post(`${PLAIN_API_URL}/forms`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create forms failed");
  }
};

const UpdateCustomForm = async ({
  id,
  tenantId,
  name,
  isDraft,
  isTemplate,
  formFields,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      tenantId,
      name,
      isDraft,
      isTemplate,
      formFields,
    };

    const response = await authFetch.put(`${PLAIN_API_URL}/forms`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.message || "update forms failed");
  }
};

const GetFormsByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/forms/tenant/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(error.message || "Get forms by tenant id failed");
  }
};
const GetDraftsByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/forms/tenant/drafts/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(error.message || "Get forms drafts by tenant id failed");
  }
};
const GetTemplatesByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/forms/tenant/templates/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(error.message || "Get forms templates by tenant id failed");
  }
};

const GetFormsByFormId = async ({ formId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/forms/${formId}`);
    return response;
  } catch (error) {
    throw new Error(error.message || "Get forms by form id failed");
  }
};
const DuplicateFormByFormId = async ({ formId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/forms/duplicate/${formId}`);
    return response;
  } catch (error) {
    throw new Error(error.message || "Duplicate form by form id failed");
  }
};
const DeleteFormsByFormId = async ({
  formId,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/forms/${formId}/${active}`
    );
    return response;
  } catch (error) {
    throw new Error(error.message || "Delete a form by form id failed");
  }
};

export default {
  CreateCustomForm,
  UpdateCustomForm,
  GetFormsByTenantId,
  GetDraftsByTenantId,
  GetTemplatesByTenantId,
  DuplicateFormByFormId,
  GetFormsByFormId,
  DeleteFormsByFormId,
};
