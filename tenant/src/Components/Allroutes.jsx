// src/Components/Allroutes.jsx
import React, { useEffect, Suspense } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import NotFound from "./NotFound";
import FullPageLoader from "./FullPageLoader";
import ProtectedRoute from "./ProtectedRoute";
import { LayoutRoute } from "../Layout/TenantLayout";
import usePermissions from "../hooks/usePermissions";
import { showToast } from "../Helper/ShowToast";

// Recover from stale chunk references after a deploy: if a lazily-imported route
// chunk fails to load (its hashed filename no longer exists on the server),
// reload once to pull the fresh index.html. A sessionStorage guard prevents an
// infinite reload loop when the failure is genuine.
const lazyWithReload = (factory) =>
  React.lazy(() =>
    factory()
      .then((module) => {
        sessionStorage.removeItem("chunkReloadAttempted");
        return module;
      })
      .catch((error) => {
        if (!sessionStorage.getItem("chunkReloadAttempted")) {
          sessionStorage.setItem("chunkReloadAttempted", "1");
          window.location.reload();
          return new Promise(() => {});
        }
        throw error;
      })
  );


/** Wraps a lazy component in Suspense so route transitions show the branded loader */
const Lazy = ({ children }) => (
  <Suspense fallback={<FullPageLoader />}>{children}</Suspense>
);

/** Blocks child routes if user lacks the given module. Shows a toast, renders nothing. */
const ModuleGuard = ({ moduleKey }) => {
  const { hasModule } = usePermissions();
  const allowed = hasModule(moduleKey);

  useEffect(() => {
    if (!allowed) {
      showToast("You don't have access to this module", "error");
    }
  }, [allowed]);

  if (!allowed) return null;
  return <Outlet />;
};
const ClinicalReportBuilder = lazyWithReload(() =>
  import("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/ClinicalReportBuilder")
);
const TemplateBuilder = lazyWithReload(() =>
  import("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/TemplateBuilder")
);
const AuditTrails = lazyWithReload(() =>
  import("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/AuditTrails")
);

// Lazy load all your pages
const AdminLogin = lazyWithReload(() =>
  import("../Pages/Authentication/Login/AdminLogin")
);
const Admin2FAAuthenticatorLogin = lazyWithReload(() =>
  import("../Pages/Authentication/Login/Admin2FAAuthenticatorLogin.")
);
const Admin2FAQuestionLogin = lazyWithReload(() =>
  import("../Pages/Authentication/Login/Admin2FAQuestionLogin")
);
const InitialSuperLogin = lazyWithReload(() =>
  import("../Pages/Authentication/AuthOnboarding/SuperAdmin/InitialSuperLogin")
);
const SuperChangePassword = lazyWithReload(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperChangePassword"
  )
);
const SuperAdmin2FAChoice = lazyWithReload(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperAdmin2FAChoice"
  )
);
const Authenticator2FA = lazyWithReload(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/Authenticator2FA"
  )
);
const QuestionAndAnswer2FA = lazyWithReload(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/QuestionAndAnswer2FA"
  )
);
const Admin2FAChoice = lazyWithReload(() =>
  import("../Pages/Authentication/AuthOnboarding/Admin/Admin2FAChoice")
);
const AdminOnboarding = lazyWithReload(() =>
  import("../Pages/Authentication/AuthOnboarding/Admin/AdminOnboarding")
);
const ForgetPassword = lazyWithReload(() =>
  import("../Pages/Authentication/ForgotPassword/ForgotPassword")
);
const ForgotPasswordResetPassword = lazyWithReload(() =>
  import("../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword")
);
const ForgotPasswordAuthenticatorVerifier = lazyWithReload(() =>
  import(
    "../Pages/Authentication/ForgotPassword/ForgotPasswordAuthenticatorVerifier"
  )
);
const ForgotPasswordQuestionVerifier = lazyWithReload(() =>
  import(
    "../Pages/Authentication/ForgotPassword/ForgotPasswordQuestionVerifier"
  )
);

const Dashboard = lazyWithReload(() =>
  import("../Pages/Dashboard/TenantDashboard")
);
const Calendar = lazyWithReload(() =>
  import("../Pages/Scheduler/SchdedulerSubs/Calendar")
);
const Appointments = lazyWithReload(() =>
  import("../Pages/Scheduler/SchdedulerSubs/Appointments")
);
const StartAppointment = lazyWithReload(() =>
  import("../Pages/Scheduler/StartAppointment/StartAppointment")
);

const Pipeline = lazyWithReload(() => import("../Pages/Client/Pipeline/Pipeline"));
const ManageColumn = lazyWithReload(() =>
  import("./ManageColumn/ManageColumn")
);
const ClientPanel = lazyWithReload(() =>
  import("../Pages/Client/Pipeline/ClientPanel/ClientPanel")
);
const ClientList = lazyWithReload(() =>
  import("../Pages/Client/ClientList/ClientList")
);
const ViewPrograms = lazyWithReload(() =>
  import(
    "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ProgramSub/ViewPrograms"
  )
);

const ProgramLibrary = lazyWithReload(() =>
  import("../Pages/ProgramLibrary/ProgramLibrary")
);
const TargetSingle = lazyWithReload(() =>
  import("../Pages/ProgramLibrary/TargetSingle")
);

const General = lazyWithReload(() =>
  import("../Pages/Organisation/General/General")
);
const PracticeSettings = lazyWithReload(() =>
  import("../Pages/Organisation/PracticeSettings/PracticeSettings")
);
const StaffsAndTeams = lazyWithReload(() =>
  import("../Pages/Organisation/StaffAndTeams/StaffsAndTeams")
);
const SingleStaffByAdmin = lazyWithReload(() =>
  import("../Pages/Organisation/StaffAndTeams/SingleStaffByAdmin")
);
const RoleAndPermission = lazyWithReload(() =>
  import("../Pages/Organisation/RoleAndPermissions/RoleAndPermission")
);

const TimeSheet = lazyWithReload(() =>
  import("../Pages/BillingAndPayment/TimeSheet/TimeSheet")
);
const SingleTimeSheet = lazyWithReload(() =>
  import("../Pages/BillingAndPayment/TimeSheet/SingleTimeSheet")
);
const Claims = lazyWithReload(() =>
  import("../Pages/BillingAndPayment/Claims/Claims")
);
const SingleClaim = lazyWithReload(() =>
  import("../Pages/BillingAndPayment/Claims/SingleClaim")
);
const SingleViewPayer = lazyWithReload(() =>
  import("../Pages/BillingAndPayment/Settings/SettingSubs/SingleViewPayer")
);

const Payroll = lazyWithReload(() => import("../Pages/Payroll/Payroll/Payroll"));
const PayrollSettings = lazyWithReload(() =>
  import("../Pages/Payroll/PayrollSetting/PayrollSettings")
);
const ViewBreakDown = lazyWithReload(() =>
  import("../Pages/Payroll/Payroll/ViewBreakDown")
);

const Forms = lazyWithReload(() => import("../Pages/CustomForms/Forms/Forms"));
const FormBuilder = lazyWithReload(() =>
  import("../Pages/CustomForms/Forms/FormBuilder")
);
const FormRenderer = lazyWithReload(() =>
  import("../Pages/CustomForms/FormRender/FormRenderer")
);
const FormResponses = lazyWithReload(() =>
  import("../Pages/CustomForms/FormResponses/FormResponses")
);
const TemplatesLibrary = lazyWithReload(() =>
  import("../Pages/CustomForms/TemplatesLibrary/TemplatesLibrary")
);

const Reports = lazyWithReload(() => import("../Pages/Reports/Reports"));
const CancelledAppointmentsReport = lazyWithReload(() => import("../Pages/Reports/ReportSubs/CancelledAppointmentsReport"));
const RescheduledAppointmentsReport = lazyWithReload(() => import("../Pages/Reports/ReportSubs/RescheduledAppointmentsReport"));
const AttendanceByServiceTypeReport = lazyWithReload(() => import("../Pages/Reports/ReportSubs/AttendanceByServiceTypeReport"));
const AttendanceBySessionTypeReport = lazyWithReload(() => import("../Pages/Reports/ReportSubs/AttendanceBySessionTypeReport"));
const AuditLogsReport = lazyWithReload(() => import("../Pages/Reports/ReportSubs/AuditLogsReport"));
const LoginLogsReport = lazyWithReload(() => import("../Pages/Reports/ReportSubs/LoginLogsReport"));

const SupportRequests = lazyWithReload(() =>
  import("../Pages/HelpAndSupport/SupportRequests/SupportRequests")
);
const KnowledgeBase = lazyWithReload(() =>
  import("../Pages/HelpAndSupport/KnowledgeBase/KnowledgeBase")
);
const ViewRequestDetails = lazyWithReload(() =>
  import("../Pages/HelpAndSupport/SupportRequests/ViewRequestDetails")
);

const Settings = lazyWithReload(() => import("../Pages/Settings/settings"));

const Notifications = lazyWithReload(() =>
  import("../Pages/Notifications/Notifications")
);

const ClientReportView = lazyWithReload(() =>
  import("../Pages/ClientReportView/ClientReportView")
);

const AllRoutes = () => {
  return (
    <Routes>
      {/* Public / Auth Routes - Available on root domain and subdomains */}
      <Route path="/" element={<Lazy><AdminLogin /></Lazy>} />

      {/* Public Client Report View - No auth/layout required, link sent via email */}
      <Route path="/report/client-view/:reportId" element={<Lazy><ClientReportView /></Lazy>} />
      <Route path="/auth/2fa/login-authenticator" element={<Lazy><Admin2FAAuthenticatorLogin /></Lazy>} />
      <Route path="/auth/2fa/login-question" element={<Lazy><Admin2FAQuestionLogin /></Lazy>} />
      <Route path="/auth/initial-login" element={<Lazy><InitialSuperLogin /></Lazy>} />
      <Route path="/auth/change-password" element={<Lazy><SuperChangePassword /></Lazy>} />
      <Route path="/auth/2fa-settings" element={<Lazy><SuperAdmin2FAChoice /></Lazy>} />
      <Route path="/auth/2fa/choice" element={<Lazy><Admin2FAChoice /></Lazy>} />
      <Route path="/auth/2fa/authenticator" element={<Lazy><Authenticator2FA /></Lazy>} />
      <Route path="/auth/2fa/security-question" element={<Lazy><QuestionAndAnswer2FA /></Lazy>} />
      <Route path="/auth/staff/onboarding/:email/:userId" element={<Lazy><AdminOnboarding /></Lazy>} />
      <Route path="/auth/reset-password/:userId" element={<Lazy><ForgotPasswordResetPassword /></Lazy>} />
      <Route path="/auth/forgot-password" element={<Lazy><ForgetPassword /></Lazy>} />
      <Route path="/auth/forgot-password/2fa-auth-verify" element={<Lazy><ForgotPasswordAuthenticatorVerifier /></Lazy>} />
      <Route path="/auth/forgot-password/2fa-question-verify" element={<Lazy><ForgotPasswordQuestionVerifier /></Lazy>} />

      {/* Tenant-Only Routes — wrapped in persistent layout */}
      <Route element={<ProtectedRoute><LayoutRoute /></ProtectedRoute>}>
        {/* Dashboard */}
        <Route element={<ModuleGuard moduleKey="DASHBOARD" />}>
          <Route path="/dashboard" element={<Lazy><Dashboard /></Lazy>} />
        </Route>

        {/* Scheduler */}
        <Route element={<ModuleGuard moduleKey="SCHEDULER" />}>
          <Route path="/scheduler/calendar" element={<Lazy><Calendar /></Lazy>} />
          <Route path="/scheduler/appointments" element={<Lazy><Appointments /></Lazy>} />
          <Route path="/appointments/start/:appointmentId/:clientId" element={<Lazy><StartAppointment /></Lazy>} />
        </Route>

        {/* Clients */}
        <Route element={<ModuleGuard moduleKey="CLIENTS" />}>
          <Route path="/clients/pipeline" element={<Lazy><Pipeline /></Lazy>} />
          <Route path="/pipeline/column-single/:pipelineStageId" element={<Lazy><ManageColumn /></Lazy>} />
          <Route path="/client/client-single/:clientId/:tenantClientId" element={<Lazy><ClientPanel /></Lazy>} />
          <Route path="/client/view-client/:clientId/:tenantClientId" element={<Lazy><ClientPanel /></Lazy>} />
          <Route path="/clinical-report/report-builder" element={<Lazy><ClinicalReportBuilder /></Lazy>} />
          <Route path="/clinical-report/template-builder" element={<Lazy><TemplateBuilder /></Lazy>} />
          <Route path="/clinical-report/audit-trails" element={<Lazy><AuditTrails /></Lazy>} />
          <Route path="/clients/client-list" element={<Lazy><ClientList /></Lazy>} />
          <Route path="/client/view-program/:clientId/target/:programId" element={<Lazy><ViewPrograms /></Lazy>} />
        </Route>

        {/* Program Library */}
        <Route element={<ModuleGuard moduleKey="PROGRAM_LIBRARY" />}>
          <Route path="/program-library" element={<Lazy><ProgramLibrary /></Lazy>} />
          <Route path="/target-single/:domainName/:programName/:targetName" element={<Lazy><TargetSingle /></Lazy>} />
          <Route path="/target-single/:programName/:targetName" element={<Lazy><TargetSingle /></Lazy>} />
        </Route>

        {/* My Organization */}
        <Route element={<ModuleGuard moduleKey="MY_ORGANIZATION" />}>
          <Route path="/organization/general" element={<Lazy><General /></Lazy>} />
          <Route path="/organization/staff-and-teams" element={<Lazy><StaffsAndTeams /></Lazy>} />
          <Route path="/organization/staff-and-teams/single-staff/:tenantStaffId" element={<Lazy><SingleStaffByAdmin /></Lazy>} />
          <Route path="/organization/practice-settings" element={<Lazy><PracticeSettings /></Lazy>} />
          <Route path="/organization/role-and-permissions" element={<Lazy><RoleAndPermission /></Lazy>} />
        </Route>

        {/* Billing & Payments */}
        <Route element={<ModuleGuard moduleKey="BILLINGS_PAYMENTS" />}>
          <Route path="/billing/timesheets" element={<Lazy><TimeSheet /></Lazy>} />
          <Route path="/billing/timesheets/:timesheetId" element={<Lazy><SingleTimeSheet /></Lazy>} />
          <Route path="/billing/claims" element={<Lazy><Claims /></Lazy>} />
          <Route path="/billing/claims/view/:claimId" element={<Lazy><SingleClaim /></Lazy>} />
          {/* Billing settings moved under My Organization → Practice Settings. */}
          <Route path="/billing/settings" element={<Navigate to="/organization/practice-settings" replace />} />
          <Route path="/organization/practice-settings/view-payer/:id/:payerName" element={<Lazy><SingleViewPayer /></Lazy>} />
        </Route>

        {/* Payroll */}
        <Route element={<ModuleGuard moduleKey="PAYROLL" />}>
          <Route path="/payroll/payroll-setup" element={<Lazy><Payroll /></Lazy>} />
          <Route path="/payroll/payroll/view-breakdown/:id" element={<Lazy><ViewBreakDown /></Lazy>} />
          <Route path="/payroll/payroll-settings" element={<Lazy><PayrollSettings /></Lazy>} />
        </Route>

        {/* Custom Forms */}
        <Route element={<ModuleGuard moduleKey="CUSTOM_FORMS" />}>
          <Route path="/custom-forms/forms" element={<Lazy><Forms /></Lazy>} />
          <Route path="/custom-forms/forms/create" element={<Lazy><FormBuilder /></Lazy>} />
          <Route path="/custom-forms/forms/create/:formId" element={<Lazy><FormBuilder /></Lazy>} />
          <Route path="/custom-forms/forms/renderer/:id" element={<Lazy><FormRenderer /></Lazy>} />
          <Route path="/custom-forms/forms/responses/:formId" element={<Lazy><FormResponses /></Lazy>} />
          <Route path="/custom-forms/templates-library" element={<Lazy><TemplatesLibrary /></Lazy>} />
        </Route>

        {/* Reports */}
        <Route element={<ModuleGuard moduleKey="REPORTS" />}>
          <Route path="/reports" element={<Lazy><Reports /></Lazy>} />
          <Route path="/reports/cancelled-appointments" element={<Lazy><CancelledAppointmentsReport /></Lazy>} />
          <Route path="/reports/rescheduled-appointments" element={<Lazy><RescheduledAppointmentsReport /></Lazy>} />
          <Route path="/reports/attendance-service-type" element={<Lazy><AttendanceByServiceTypeReport /></Lazy>} />
          <Route path="/reports/attendance-session-type" element={<Lazy><AttendanceBySessionTypeReport /></Lazy>} />
          <Route path="/reports/audit-logs" element={<Lazy><AuditLogsReport /></Lazy>} />
          <Route path="/reports/login-logs" element={<Lazy><LoginLogsReport /></Lazy>} />
        </Route>

        {/* Help & Support */}
        <Route element={<ModuleGuard moduleKey="HELP_SUPPORT" />}>
          <Route path="/help/support-requests" element={<Lazy><SupportRequests /></Lazy>} />
          <Route path="/help/support-requests/:requestId" element={<Lazy><ViewRequestDetails /></Lazy>} />
          <Route path="/help/knowledge-base" element={<Lazy><KnowledgeBase /></Lazy>} />
        </Route>

        {/* Settings */}
        <Route element={<ModuleGuard moduleKey="SETTINGS" />}>
          <Route path="/settings" element={<Lazy><Settings /></Lazy>} />
        </Route>

        {/* Notifications — always accessible (no module guard) */}
        <Route path="/notifications" element={<Lazy><Notifications /></Lazy>} />
      </Route>

      {/* Optional: Redirect any unknown route to home */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AllRoutes;
