import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateFeature = async ({
  featureGroupId,
  name,
  description,
  active,
  applicablePlans,
  managedBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/feature/feature`, {
      featureGroupId,
      name,
      description,
      active,
      applicablePlans,
      managedBy,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Feature creation failed");
  }
};

const UpdateFeature = async ({
  id,
  name,
  description,
  active,
  applicablePlans,
  managedBy,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/feature/feature`, {
      id,
      name,
      description,
      active,
      applicablePlans,
      managedBy,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Feature update failed");
  }
};

const DeleteFeature = async ({
  id,
  administratorPassword,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(
      `${PLAIN_API_URL}/feature/feature`,
      {
        data: { id, administratorPassword },
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Feature deletion failed");
  }
};

const GetSingleFeature = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/feature/getfeature/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature retrieval failed"
    );
  }
};

const GetAllFeatures = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/feature/allfeature`);
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature retrieval failed"
    );
  }
};

const CreateFeatureGroup = async ({ name, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/feature/featuregroup`,
      {
        name,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature group creation failed"
    );
  }
};

const GetSingleFeatureGroup = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/feature/getfeaturegroup/${id}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature retrieval failed"
    );
  }
};

const GetAllFeatureGroups = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/feature/allfeaturegroup`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature group retrieval failed"
    );
  }
};

const UpdateFeatureGroup = async ({ id, name, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/feature/group`, {
      id,
      name,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature group update failed"
    );
  }
};

const DeleteFeatureGroup = async ({
  id,
  administratorPassword,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/feature/group`, {
      data: { id, administratorPassword },
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature group deletion failed"
    );
  }
};

const MoveFeatureToAnotherGroup = async ({
  id,
  featureGroupId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/feature/move`,
      {
        id,
        featureGroupId,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature group update failed"
    );
  }
};

const EnableOrDisableFeature = async ({
  id,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/feature/active`,
      {
        id,
        active,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Feature group update failed"
    );
  }
};
const AssignFeatureToPlan = async ({
  id,
 applicablePlans,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/feature/plan`,
      {
        id,
        applicablePlans,
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Assign Feature to another plan failed"
    );
  }
};

export default {
  CreateFeature,
  UpdateFeature,
  DeleteFeature,
  GetSingleFeature,
  GetAllFeatures,
  CreateFeatureGroup,
  GetSingleFeatureGroup,
  GetAllFeatureGroups,
  UpdateFeatureGroup,
  DeleteFeatureGroup,
  MoveFeatureToAnotherGroup,
  EnableOrDisableFeature, 
  AssignFeatureToPlan
};
