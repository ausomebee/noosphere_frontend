import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetInvoiceManagementAllField = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/invoice/management`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch AutoBilling invoice management"
    );
  }
};


const UpdatePlanPurchaseToggle = async ({
  accessToken,
  refreshToken,
  id,
  onPlanPurchase,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/on-plan-purchase`,
      {
        id,
        onPlanPurchase,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update plan purchase"
    );
  }
};
const UpdateDayBeforeDueNumber = async ({
  accessToken,
  refreshToken,
  id,
  daysBeforeDueDate,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/days-before-due-date/admin`,
      {
        id,
        daysBeforeDueDate,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update days before due"
    );
  }
};
const UpcomingInvoiceEmail = async ({
  accessToken,
  refreshToken,
  id,
  upcomingInvoiceHeader,
  upcomingInvoiceBody,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/upcoming-invoice/admin`,
      {
        id,
        upcomingInvoiceHeader,
        upcomingInvoiceBody,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to create upcoming invoice email"
    );
  }
};

const UpdateOnDueDateToggle = async ({
  accessToken,
  refreshToken,
  id,
  onDueDate,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/on-due-date`,
      {
        id,
        onDueDate,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update plan purchase"
    );
  }
};

const DueInvoiceEmail = async ({
  accessToken,
  refreshToken,
  id,
  dueInvoiceHeader,
  dueInvoiceBody,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/due-invoice`,
      {
        id,
        dueInvoiceHeader,
        dueInvoiceBody,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update due invoice email"
    );
  }
};
const MarkOverDueCount = async ({
  accessToken,
  refreshToken,
  id,
  markOverDue,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/mark-over-due`,
      {
        id,
        markOverDue,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update mark to overdue"
    );
  }
};
const ReminderTimesBefore = async ({
  accessToken,
  refreshToken,
  id,
  unpaidReminderTimesBefore,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/unpaid-reminder-times-before`,
      {
        id,
        unpaidReminderTimesBefore,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update time before"
    );
  }
};

const UpdateAttachToReminderToggle = async ({
  accessToken,
  refreshToken,
  id,
  attachInvoiceToReminder,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/attach-invoice-to-reminder`,
      {
        id,
        attachInvoiceToReminder,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update attach to reminder"
    );
  }
};

const ReminderEmail = async ({
  accessToken,
  refreshToken,
  id,
  reminderEmail,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/invoice/invoice/management/reminder-email/admin`,
      {
        id,
        reminderEmail,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update reminder email"
    );
  }
};

export default {
  GetInvoiceManagementAllField,
  UpdatePlanPurchaseToggle,
  UpdateDayBeforeDueNumber,
  UpcomingInvoiceEmail,
  UpdateOnDueDateToggle,
  DueInvoiceEmail,
  MarkOverDueCount,
  ReminderTimesBefore,
  UpdateAttachToReminderToggle,
  ReminderEmail,
};
