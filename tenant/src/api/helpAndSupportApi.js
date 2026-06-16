import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateHelpAndSupportTicket = async ({
  tenantId,
  category,
  title,
  attachment,
  description,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const formData = new FormData();
    formData.append("tenantId", tenantId);
    if (category) formData.append("category", category);
    formData.append("title", title);
    formData.append("description", description);

    if (attachment && attachment.length > 0) {
      attachment.forEach((file) => {
        formData.append("attachment", file);
      });
    }

    const response = await authFetch.post(`${PLAIN_API_URL}/issue`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Help and Support ticket failed");
  }
};

const GetHelpAndSupportTicketsByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/tenant/tenant/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Help and Support tickets failed");
  }
};

// response structure
// {
//   "message": "Issue fetched successfully",
//   "status": "ok",
//   "data": [
//     {
//       "id": "f6cdfdc9-7476-4a70-a647-f9ef5264679f",
//       "category": "Payment",
//       "priority": "P2",
//       "tenantId": "439004a2-97cb-4eea-824e-e95d094c9be6",
//       "adminId": "a0c78b50-4774-4437-a268-a142fbc9e755",
//       "title": "Payment Gateway Timeout",
//       "adminLoggedById": "a0c78b50-4774-4437-a268-a142fbc9e755",
//       "status": "Not Started",
//       "resolutionDeadline": "2025-12-20T23:59:59.000Z",
//       "attachments": [
//         {
//           "key": "1764605574756-grok_report.pdf",
//           "location": "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/1764605574756-grok_report.pdf"
//         }
//       ],
//       "description": "Users are experiencing delays during checkout",
//       "resolutionDescription": null,
//       "createdAt": "2025-12-01T16:12:55.994Z",
//       "updatedAt": "2025-12-01T16:12:55.994Z",
//       "assignedTo": {
//         "fullName": "NoosphereSuper1"
//       },
//       "tenant": {
//         "companyName": "Nobleconcepts"
//       },
//       "loggedBy": {
//         "fullName": "NoosphereSuper1"
//       },
//       "comments": [],
//       "Logs": []
//     }
//   ]
// }

const GetHelpAndSupportTicketsOverviewByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/issue/tenant/tenant-overview/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.message || "Get Help and Support tickets overview failed",
    );
  }
};

// response structure
// {
//   "message": "Issue fetched successfully",
//   "status": "ok",
//   "data": {
//     "allIssues": {
//       "_count": {
//         "_all": 1
//       }
//     },
//     "pendingIssues": {
//       "_count": {
//         "_all": 1
//       }
//     },
//     "resolvedIssues": {
//       "_count": {
//         "_all": 0
//       }
//     }
//   }
// }
const GetSingleTicketById = async ({ ticketId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/issue/${ticketId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get single ticket failed");
  }
};

// the response structuredClone
// {
//   "message": "Issue fetched successfully",
//   "status": "ok",
//   "data": {
//     "id": "f6cdfdc9-7476-4a70-a647-f9ef5264679f",
//     "category": "Payment",
//     "priority": "P2",
//     "tenantId": "439004a2-97cb-4eea-824e-e95d094c9be6",
//     "adminId": "a0c78b50-4774-4437-a268-a142fbc9e755",
//     "title": "Payment Gateway Timeout",
//     "adminLoggedById": "a0c78b50-4774-4437-a268-a142fbc9e755",
//     "status": "Not Started",
//     "resolutionDeadline": "2025-12-20T23:59:59.000Z",
//     "attachments": [
//       {
//         "key": "1764605574756-grok_report.pdf",
//         "location": "https://s3.us-west-1.amazonaws.com/ausomebee-objects-storage/1764605574756-grok_report.pdf"
//       }
//     ],
//     "description": "Users are experiencing delays during checkout",
//     "resolutionDescription": null,
//     "createdAt": "2025-12-01T16:12:55.994Z",
//     "updatedAt": "2025-12-01T16:12:55.994Z",
//     "assignedTo": {
//       "fullName": "NoosphereSuper1"
//     },
//     "tenant": {
//       "companyName": "Nobleconcepts"
//     },
//     "loggedBy": {
//       "fullName": "NoosphereSuper1"
//     },
//     "comments": [],
//     "Logs": []
//   }
// }
export default {
  CreateHelpAndSupportTicket,
  GetHelpAndSupportTicketsByTenantId,
    GetHelpAndSupportTicketsOverviewByTenantId,
    GetSingleTicketById,
};
