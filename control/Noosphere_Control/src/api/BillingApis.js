
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateBillingPlan = async ({
  name,
  description,
  pricePerMonth,
  pricePerYear,
  features = [],
  planType,
  colourCode,
  forClient,
  forStaff,
  forStorage,
  extraFeaturesEnabled,
  tenantId,
  adminId,
  extraFeatures = [],
  extraFeaturesWithPrice = [],
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  const payload = {
    planType,
    name,
    colourCode,
    description,
    pricePerMonth: {
      price: pricePerMonth?.price || 0,
      currency: pricePerMonth?.currency || "USD",
    },
    pricePerYear: {
      price: pricePerYear?.price || 0,
      currency: pricePerYear?.currency || "USD",
    },
    forClient,
    forStaff,
    forStorage,
    extraFeaturesEnabled,
    tenantId,
    adminId,
    features,
    extraFeatures,
    extraFeaturesWithPrice, // should already be in correct format
  };

  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/plan`, payload);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Billing plan creation failed"
    );
  }
};

const UpdateBillingPlan = async ({
  id,
  name,
  description,
  pricePerMonth,
  pricePerYear,
  features = [],
  planType,
  colourCode,
  forClient,
  forStaff,
  forStorage,
  extraFeaturesEnabled,
  tenantId,
  adminId,
  extraFeatures = [],
  extraFeaturesWithPrice = [],
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  const payload = {
    id,
    planType,
    name,
    colourCode,
    description,
    pricePerMonth: {
      price: pricePerMonth?.price || 0,
      currency: pricePerMonth?.currency || "USD",
    },
    pricePerYear: {
      price: pricePerYear?.price || 0,
      currency: pricePerYear?.currency || "USD",
    },
    forClient,
    forStaff,
    forStorage,
    extraFeaturesEnabled,
    tenantId,
    adminId,
    features,
    extraFeatures,
    extraFeaturesWithPrice,
  };

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/plan`, payload);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Billing plan update failed"
    );
  }
};


const TogglePlanActivity = async ({
  id,
  active,
  administratorPassword,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/plan/active`, {
      id,
      active,
     administratorPassword,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Billing plan activation failed"
    );
  }
};

const DeleteBillingPlan = async ({
  id,
  administratorPassword,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.delete(`${PLAIN_API_URL}/plan`, {
      data: { id, administratorPassword },
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Billing plan deletion failed"
    );
  }
};

const GetAllPlans = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/plan`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch billing plans"
    );
  }
};

const GetSinglePlan = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/plan/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch billing plan"
    );
  }
};

const GetPlanByPlanType = async ({ planType, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/plan/type/${planType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch billing plan by type"
    );
  }
};

const DuplicateBillingPlan = async ({ planId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/plan/duplicate/${planId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Billing plan duplication failed"
    );
  }
};

const CreateSubscription = async ({
  planId,
  tenantId,
  transactionId,
  status,
  endDate,
  startDate,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/subscription`, {
      planId,
      organizationId,
      tenantId,
      transactionId,
      status,
      endDate,
      startDate,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Subscription creation failed"
    );
  }
};

const GetAllSubscriptions = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/subscription`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch subscriptions"
    );
  }
};

const GetSubscriptionById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/subscription/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch subscription"
    );
  }
};

const GetSubscriptionByPlanType = async ({
  planType,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/subscription/plan/${planType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch subscription by type"
    );
  }
};


export default {
  CreateBillingPlan,
  UpdateBillingPlan,
  TogglePlanActivity,
  DeleteBillingPlan,
  GetAllPlans,
  GetSinglePlan,
  GetPlanByPlanType,
  DuplicateBillingPlan,
  CreateSubscription,
  GetAllSubscriptions,
  GetSubscriptionById,
  GetSubscriptionByPlanType,
};
