import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateTenantStaff = async ({
  fullName,
  email,
  roleId,
  dob,
  gender,
  npi,
  address,
  city,
  state,
  zip,
  country,
  phoneNumber,
  active,
  documents,
  licenses,
  payroll,
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    // Build payroll conditionally
    const payrollPayload = {
      paymentSchedule: payroll?.paymentSchedule || "",
      ratePerHour: payroll?.ratePerHour ? String(payroll.ratePerHour) : "",
      // minimumHours conditional
      ...(payroll?.paymentSchedule === "Salaried" &&
      payroll?.minimumHours &&
      !isNaN(Number(payroll.minimumHours))
        ? { minimumHours: String(payroll.minimumHours) }
        : {}),
      otherPays:
        payroll?.otherPays
          ?.filter((pay) => pay && pay.trim() !== "")
          .map((pay) => ({ id: pay })) || [], // ← { id: pay }
      deductions:
        payroll?.deductions
          ?.filter((ded) => ded && ded.trim() !== "")
          .map((ded) => ({ id: ded })) || [], // ← { id: ded }
      tenantId,
    };

    // Only add minimumHours if it's Salaried and has a real value
    if (
      payroll?.paymentSchedule === "Salaried" &&
      payroll?.minimumHours &&
      !isNaN(Number(payroll.minimumHours))
    ) {
      payrollPayload.minimumHours = String(payroll.minimumHours);
    }

    const payload = {
      fullName,
      email,
      roleId,
      dob: dob ? new Date(dob).toISOString() : undefined,
      gender,
      npi,
      address,
      city,
      state,
      zip,
      country,
      phoneNumber,
      active,
      documents:
        documents?.map((doc) => ({
          documentsUrl: {
            filename: doc.documentsUrl?.filename || "",
            url: doc.documentsUrl?.url || "",
          },
        })) || [],
      licenses:
        licenses?.map((license) => ({
          licenseName: license.licenseName,
          licenseNumber: license.licenseNumber,
          issueState: license.issueState,
          expiryDate: license.expiryDate
            ? new Date(license.expiryDate).toISOString()
            : undefined,
        })) || [],
      payroll: payrollPayload,
      tenantId,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization-staff/staff`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Tenant Staff failed",
    );
  }
};

const UpdateTenantStaff = async ({
  id,
  fullName,
  email,
  roleId,
  tenantId,
  dob,
  gender,
  npi,
  address,
  city,
  state,
  zip,
  country,
  phoneNumber,
  active,
  documents,
  licenses,
  payroll,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    // Build payroll conditionally
    const payrollPayload = {
      id: payroll?.id || undefined,
      paymentSchedule: payroll?.paymentSchedule || "",
      ratePerHour: payroll?.ratePerHour ? String(payroll.ratePerHour) : "",
      tenantStaffId: payroll?.tenantStaffId || id,
      // minimumHours conditional
      ...(payroll?.paymentSchedule === "Salaried" &&
      payroll?.minimumHours &&
      !isNaN(Number(payroll.minimumHours))
        ? { minimumHours: String(payroll.minimumHours) }
        : {}),
      otherPays:
        payroll?.otherPays
          ?.filter((pay) => pay && pay.trim() !== "")
          .map((pay) => ({ id: pay })) || [], // ← { id: pay }
      deductions:
        payroll?.deductions
          ?.filter((ded) => ded && ded.trim() !== "")
          .map((ded) => ({ id: ded })) || [],
    };

    // Only add minimumHours if it's Salaried and has a real value
    if (
      payroll?.paymentSchedule === "Salaried" &&
      payroll?.minimumHours &&
      !isNaN(Number(payroll.minimumHours))
    ) {
      payrollPayload.minimumHours = String(payroll.minimumHours);
    }

    const payload = {
      id,
      fullName,
      email,
      roleId,
      tenantId,
      dob: dob ? new Date(dob).toISOString() : undefined,
      gender,
      npi,
      address,
      city,
      state,
      zip,
      country,
      phoneNumber,
      active,
      documents:
        documents?.map((doc) => ({
          id: doc.id || undefined,
          documentsUrl: {
            filename: doc.documentsUrl?.filename || "",
            url: doc.documentsUrl?.url || "",
          },
          tenantStaffId: doc.tenantStaffId || id,
        })) || [],
      licenses:
        licenses?.map((license) => ({
          id: license.id || undefined,
          licenseName: license.licenseName,
          licenseNumber: license.licenseNumber,
          issueState: license.issueState,
          expiryDate: license.expiryDate
            ? new Date(license.expiryDate).toISOString()
            : undefined,
          tenantStaffId: license.tenantStaffId || id,
        })) || [],
      payroll: payrollPayload,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization-staff/staff`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Tenant Staff failed",
    );
  }
};
const UpdateTenantStaffBasicInfo = async ({
  id,
  fullName,
  email,
  roleId,
  tenantId,
  dob,
  gender,
  npi,
  address,
  city,
  state,
  zip,
  country,
  phoneNumber,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      fullName,
      email,
      roleId,
      tenantId,
      dob: dob ? new Date(dob).toISOString() : undefined,
      gender,
      npi,
      address,
      city,
      state,
      zip,
      country,
      phoneNumber,
      active,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization-staff/staff/staff`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Tenant Staff failed",
    );
  }
};
const GetAllStaffByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization-staff/staff/tenant/${tenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Staffs by tenant id failed",
    );
  }
};

const UpdateActiveTenantStaff = async ({
  id,
  active,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/organization-staff/staff/active/${id}/${active}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "update active failed");
  }
};

const GetSingleTenantStaffById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization-staff/staff/details/${id}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get Single Tenant Staff by tenant id failed",
    );
  }
};

const GetAllStaffLicenseById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization-staff/license/tenant-staff/${id}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get All License by tenant staff id failed",
    );
  }
};

const GetAllStaffDocumentById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization-staff/document/tenant-staff/${id}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get All Document by tenant staff id failed",
    );
  }
};

const UpdateTenantStaffLicense = async ({
  id,
  tenantId,
  licenseName,
  licenseNumber,
  issueState,
  expiryDate,
  tenantStaffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization-staff/license`,
      {
        id,
        tenantId,
        licenseName,
        licenseNumber,
        issueState,
        expiryDate,
        tenantStaffId,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Updating License by tenant staff id failed",
    );
  }
};
const DeleteLicenseByTenantStaff = async ({
  id,
  isDeleted,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/organization-staff/license/deleted/${id}/${isDeleted}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Updating License by tenant staff id failed",
    );
  }
};
const DeleteDocumentByTenantStaff = async ({
  id,
  isDeleted,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/organization-staff/document/deleted/${id}/${isDeleted}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Updating License by tenant staff id failed",
    );
  }
};

// Updated CreateDocumentForStaff API
const CreateDocumentForStaff = async ({
  tenantId,
  documentName,
  document,
  uploadedBy,
  documentsUrl,
  tenantStaffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization-staff/document`,
      {
        tenantId,
        documentName,
        document: document || "",
        uploadedBy,
        documentsUrl,
        tenantStaffId,
      },
    );
    return response;
  } catch (e) {
    throw new Error(e.response?.data?.message || "Create Document failed");
  }
};

const CreateLicenseForStaff = async ({
  tenantStaffId,
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
      `${PLAIN_API_URL}/organization-staff/license`,
      {
        tenantStaffId,
        licenseName,
        licenseNumber,
        issueState,
        expiryDate,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create Organization Licenses failed",
    );
  }
};
const GetAllStaffPayrollById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization-staff/payroll/tenant-staff/${id}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get All Payroll by tenant staff id failed",
    );
  }
};

const UpdateTenantStaffPayroll = async ({
  id,
  payroll,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,

      id: payroll?.id || undefined,
      paymentSchedule: payroll?.paymentSchedule || "",
      ratePerHour: payroll?.ratePerHour ? String(payroll.ratePerHour) : "",
      tenantStaffId: payroll?.tenantStaffId || id,
      minimumHours: payroll?.minimumHours ? String(payroll.minimumHours) : "",
      otherPays:
        payroll?.otherPays
          ?.filter((pay) => pay.type && pay.rate)
          .map((pay) => ({
            type: pay.type,
            rate: String(pay.rate),
          })) || [],
      deductions:
        payroll?.deductions
          ?.filter((ded) => ded.type && ded.rate)
          .map((ded) => ({
            type: ded.type,
            rate: String(ded.rate),
          })) || [],
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization-staff/payroll`,
      payload,
    );
    return response.data; // Return response.data for consistency
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update Tenant Staff failed",
    );
  }
};

// ─── Staff Appointments ───

const GetStaffUpcomingAppointments = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/staff/upcoming/${staffId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get staff upcoming appointments failed",
    );
  }
};

const GetStaffAppointments = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/staff/${staffId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get staff appointments failed",
    );
  }
};

// ─── Staff Availability ───

const CreateStaffAvailability = async ({
  staffId,
  availabilityDays,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/organization/staff-availability`,
      { staffId, availabilityDays },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create staff availability failed",
    );
  }
};

const UpdateStaffAvailability = async ({
  id,
  availabilityDays,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/organization/staff-availability`,
      { id, availabilityDays },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update staff availability failed",
    );
  }
};

const GetStaffAvailability = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/organization/staff-availability/staff/${staffId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get staff availability failed",
    );
  }
};

// ─── Staff Clients ───

const GetStaffClients = async ({
  staffId,
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client/clinician/${staffId}/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get staff clients failed",
    );
  }
};

const GetStaffPayrollCycleStats = async ({
  staffId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/payroll-cycles/staff/${staffId}/stats`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get staff payroll cycle stats failed",
    );
  }
};

export default {
  CreateTenantStaff,
  UpdateTenantStaff,
  GetAllStaffByTenantId,
  UpdateActiveTenantStaff,
  GetSingleTenantStaffById,
  GetAllStaffDocumentById,
  GetAllStaffLicenseById,
  UpdateTenantStaffLicense,
  DeleteLicenseByTenantStaff,
  DeleteDocumentByTenantStaff,
  CreateDocumentForStaff,
  CreateLicenseForStaff,
  GetAllStaffPayrollById,
  UpdateTenantStaffPayroll,
  UpdateTenantStaffBasicInfo,
  GetStaffUpcomingAppointments,
  GetStaffAppointments,
  CreateStaffAvailability,
  UpdateStaffAvailability,
  GetStaffAvailability,
  GetStaffClients,
  GetStaffPayrollCycleStats,
};
