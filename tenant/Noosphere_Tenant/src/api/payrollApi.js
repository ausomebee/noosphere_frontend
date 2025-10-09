import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetCompensationTypeByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/compensation-types/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Get Compensation Type by tenant id failed"
    );
  }
};

const UpdateCompensationTypeActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/compensation-types/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};

const CreateIncomeItems = async ({
  tenantId,
  name,
  type,
  rate,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    // Clean rate object based on type
    const cleanedRate = {};
    if (type === "Flat Rate") {
      cleanedRate.rate = rate.rate;
    } else if (type === "Time based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.unitMinutes = rate.unitMinutes;
      cleanedRate.duration = rate.duration;
    } else if (type === "Percentage based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.duration = rate.duration;
    }

    const payload = {
      tenantId,
      name,
      type,
      rate: cleanedRate,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/income-items`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Income Items failed");
  }
};

const UpdateIncomeItems = async ({
  id,
  tenantId,
  name,
  type,
  rate,
  isActive,
  isDeleted,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    // Clean rate object based on type
    const cleanedRate = {};
    if (type === "Flat Rate") {
      cleanedRate.rate = rate.rate;
    } else if (type === "Time based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.unitMinutes = rate.unitMinutes;
      cleanedRate.duration = rate.duration;
    } else if (type === "Percentage based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.duration = rate.duration;
    }

    const payload = {
      id,
      tenantId,
      name,
      type,
      rate: cleanedRate,
      isActive,
      isDeleted,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/income-items`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Income Items failed");
  }
};

const GetIncomeItemsByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/income-items/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Income Items by tenant id failed");
  }
};

const UpdateIncomeItemsActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/income-items/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};

const CreateDeductions = async ({
  tenantId,
  name,
  type,
  rate,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    // Clean rate object based on type
    const cleanedRate = {};
    if (type === "Flat Rate") {
      cleanedRate.rate = rate.rate;
    } else if (type === "Time based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.unitMinutes = rate.unitMinutes;
      cleanedRate.duration = rate.duration;
    } else if (type === "Percentage based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.duration = rate.duration;
    }

    const payload = {
      tenantId,
      name,
      type,
      rate: cleanedRate,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/deductions`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Deductions failed");
  }
};

const UpdateDeductions = async ({
  id,
  tenantId,
  name,
  type,
  rate,
  isActive,
  isDeleted,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    // Clean rate object based on type
    const cleanedRate = {};
    if (type === "Flat Rate") {
      cleanedRate.rate = rate.rate;
    } else if (type === "Time based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.unitMinutes = rate.unitMinutes;
      cleanedRate.duration = rate.duration;
    } else if (type === "Percentage based") {
      cleanedRate.unit = rate.unit;
      cleanedRate.duration = rate.duration;
    }

    const payload = {
      id,
      tenantId,
      name,
      type,
      rate: cleanedRate,
      isActive,
      isDeleted,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/deductions`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Deductions failed");
  }
};

const GetDeductionsByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/deductions/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Deductions by tenant id failed");
  }
};

const UpdateDeductionsActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/deductions/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};

const CreatePayrollCycles = async ({
  tenantId,
  name,
  compensationTypeId,
  interval,
  startDate,
  autoRun,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      name,
      compensationTypeId,
      interval,
      startDate,
      autoRun,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/payroll-cycles`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Payroll Cycles failed");
  }
};
const UpdatePayrollCycles = async ({
  id,
  tenantId,
  name,
  compensationTypeId,
  interval,
  startDate,
  autoRun,
  isActive,
  isDeleted,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      tenantId,
      name,
      compensationTypeId,
      interval,
      startDate,
      autoRun,
      isActive,
      isDeleted,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/payroll-cycles`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Payroll Cycles failed");
  }
};

const GetPayrollCycleByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/payroll-cycles/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Payroll Cycle by tenant id failed");
  }
};

const UpdatePayrollCycleActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/payroll-cycles/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};

export default {
  GetCompensationTypeByTenantId,
  UpdateCompensationTypeActiveness,
  CreateIncomeItems,
  UpdateIncomeItems,
  GetIncomeItemsByTenantId,
  UpdateIncomeItemsActiveness,
  CreateDeductions,
  UpdateDeductions,
  GetDeductionsByTenantId,
  UpdateDeductionsActiveness,
  CreatePayrollCycles,
  UpdatePayrollCycles,
  GetPayrollCycleByTenantId,
  UpdatePayrollCycleActiveness,
};
