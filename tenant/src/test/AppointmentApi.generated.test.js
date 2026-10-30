import { describe, it, expect, vi, beforeEach } from 'vitest';

const verbs = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../Helper/AxiosInterceptor', () => ({ default: () => verbs }));

import api from '../api/AppointmentApi.js';

/**
 * Every wrapper in AppointmentApi.js follows one shape: build an authenticated client,
 * make the call, and on failure rethrow as `new Error(body.message || <its own
 * copy>)`. This drives all three arms of each -- success, a backend message,
 * and the fallback when the backend sends none -- from one table.
 */

const tokens = { accessToken: 'at', refreshToken: 'rt' };

// [ method name, HTTP verb, minimal args, fallback message, where the
//   wrapper reads the backend message from: the response body or error.message ]
const WRAPPERS = [
  ['CreateAppointments', 'post', { tenantId: "tenantId", clientId: "clientId", sessionId: "sessionId", clinicians: [], service: "service", date: new Date('2026-01-05T00:00:00Z'), isRecurring: "isRecurring", startTime: "startTime", endTime: "endTime", recurrence: "recurrence", isBillable: "isBillable", serviceLocation: "serviceLocation", requiresTravel: "requiresTravel", colourCode: "colourCode" }, 'Create Appointment failed', 'body'],
  ['UpdateAppointments', 'put', { id: "id", tenantId: "tenantId", clientId: "clientId", sessionId: "sessionId", clinicians: [], service: "service", date: new Date('2026-01-05T00:00:00Z'), isRecurring: "isRecurring", startTime: "startTime", endTime: "endTime", recurrence: "recurrence", isBillable: "isBillable", serviceLocation: "serviceLocation", requiresTravel: "requiresTravel", colourCode: "colourCode", relatedAppointment: "relatedAppointment", forAll: "forAll" }, 'Update Appointment failed', 'body'],
  ['GetSessionTypeActiveByTenantId', 'get', { tenantId: "tenantId" }, 'Get session Type active by tenant id failed', 'message'],
  ['GetClientByTenantId', 'get', { tenantId: "tenantId" }, 'Get Client by tenant id failed', 'message'],
  ['GetTenantStaffByTenantId', 'get', { tenantId: "tenantId" }, 'Get Tenant Staff by tenant id failed', 'message'],
  ['GetAvailableTenantStaff', 'get', { tenantId: "tenantId", date: new Date('2026-01-05T00:00:00Z'), startTime: "startTime", endTime: "endTime" }, 'Get available tenant staff failed', 'body'],
  ['GetAllAppointments', 'get', { tenantId: "tenantId" }, 'Get Tenant All Appointments by tenant id failed', 'message'],
  ['GetAppointmentByTenantId', 'get', { tenantId: "tenantId" }, 'Get Tenant All Appointments by tenant id failed', 'message'],
  ['GetAppointmentByStaffId', 'get', { staffId: "staffId" }, 'Get Staff All Appointments by staff id failed', 'message'],
  ['GetAppointmentByClientId', 'get', { clientId: "clientId" }, 'Get Client All Appointments by client id failed', 'message'],
  ['CancelAppointments', 'put', { tenantId: "tenantId", id: "id", isCanceled: "isCanceled", relatedAppointment: "relatedAppointment", reason: "reason", forAll: "forAll" }, 'Cancel Appointment failed', 'message'],
  ['RescheduleAppointments', 'put', { tenantId: "tenantId", id: "id", date: new Date('2026-01-05T00:00:00Z'), startTime: "startTime", endTime: "endTime", relatedAppointment: "relatedAppointment", forAll: "forAll", rescheduled: "rescheduled" }, 'Reschedule Appointment failed', 'message'],
  ['GetCancelledAppointmentByTenantId', 'get', { tenantId: "tenantId" }, 'Get Tenant All Cancelled Appointments by tenant id failed', 'message'],
  ['GetCancelledAppointmentByStaffId', 'get', { staffId: "staffId" }, 'Get Staff All Cancelled Appointments by staff id failed', 'message'],
  ['GetRescheduleAppointmentReqByTenantId', 'get', { tenantId: "tenantId" }, 'Get Tenant All Resheduled Req Appointments by tenant id failed', 'message'],
  ['GetRescheduleAppointmentReqByStaffId', 'get', { staffId: "staffId" }, 'Get staff All Resheduled Req Appointments by tenant id failed', 'message'],
  ['GetRescheduleAppointmentReqByClientId', 'get', { clientId: "clientId" }, 'Get Client All Resheduled Req Appointments by client id failed', 'message'],
  ['ApproveRescheduledReq', 'patch', { appointments: "appointments" }, 'Approve Reschedule Req failed', 'body'],
  ['RejectRescheduledReq', 'patch', { appointments: "appointments" }, 'Reject Reschedule Req failed', 'body'],
  ['GetUpcomingAppointmentByTenantId', 'get', { tenantId: "tenantId" }, 'Get Tenant All Upcoming Appointments by tenant id failed', 'message'],
  ['GetUpcomingAppointmentByStaffId', 'get', { staffId: "staffId" }, 'Get staff All Upcoming Appointments by staff id failed', 'message'],
  ['GetPastAppointmentByTenantId', 'get', { tenantId: "tenantId" }, 'Get Tenant All past Appointments by tenant id failed', 'message'],
  ['GetPastAppointmentByStaffId', 'get', { staffId: "staffId" }, 'Get staff All Past Appointments by staff id failed', 'message'],
  ['GetClientProgramAndTargetsDetails', 'get', { clientId: "clientId" }, 'Get Client Appointments Details by client id failed', 'message'],
  ['GetAppointmentById', 'get', { Id: "Id" }, 'Get Client Appointments Details by client id failed', 'message'],
  ['SubmitStartAppointment', 'post', { appointmentId: "appointmentId", note: "note", startTime: "startTime", endTime: "endTime", travelStartTime: "travelStartTime", travelEndTime: "travelEndTime", sessionDatas: "sessionDatas", createdBy: "createdBy" }, 'Submitting Appointment failed', 'message'],
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(verbs).forEach((v) => v.mockReset());
});

describe('AppointmentApi.js', () => {
  it.each(WRAPPERS)('%s resolves on success', async (name, verb, args) => {
    // Not every wrapper returns a value -- some await and discard -- so assert
    // that the call went out rather than on what came back.
    verbs[verb].mockResolvedValue({ data: { ok: true } });
    await expect(api[name]({ ...args, ...tokens })).resolves.not.toThrow();
    expect(verbs[verb]).toHaveBeenCalled();
  });

  it.each(WRAPPERS)('%s surfaces the message the backend returned', async (name, verb, args, _fb, accessor) => {
    verbs[verb].mockRejectedValue(
      accessor === 'body'
        ? { response: { data: { message: 'backend said so' } } }
        : new Error('backend said so')
    );
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow('backend said so');
  });

  it.each(WRAPPERS)('%s falls back to its own copy', async (name, verb, args, fallback, accessor) => {
    // A rejection carrying nothing the wrapper can read: no body for the ones
    // that look there, and no message for the ones that read error.message.
    verbs[verb].mockRejectedValue(accessor === 'body' ? new Error('') : {});
    await expect(api[name]({ ...args, ...tokens })).rejects.toThrow(fallback);
  });
});
