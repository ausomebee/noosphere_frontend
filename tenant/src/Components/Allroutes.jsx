// src/Components/Allroutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ClinicalReportBuilder from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/ClinicalReportBuilder";
import TemplateBuilder from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/TemplateBuilder";
import AuditTrails from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/AuditTrails";

// Lazy load all your pages
const AdminLogin = React.lazy(() =>
  import("../Pages/Authentication/Login/AdminLogin")
);
const Admin2FAAuthenticatorLogin = React.lazy(() =>
  import("../Pages/Authentication/Login/Admin2FAAuthenticatorLogin.")
);
const Admin2FAQuestionLogin = React.lazy(() =>
  import("../Pages/Authentication/Login/Admin2FAQuestionLogin")
);
const InitialSuperLogin = React.lazy(() =>
  import("../Pages/Authentication/AuthOnboarding/SuperAdmin/InitialSuperLogin")
);
const SuperChangePassword = React.lazy(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperChangePassword"
  )
);
const SuperAdmin2FAChoice = React.lazy(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperAdmin2FAChoice"
  )
);
const Authenticator2FA = React.lazy(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/Authenticator2FA"
  )
);
const QuestionAndAnswer2FA = React.lazy(() =>
  import(
    "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/QuestionAndAnswer2FA"
  )
);
const AdminOnboarding = React.lazy(() =>
  import("../Pages/Authentication/AuthOnboarding/Admin/AdminOnboarding")
);
const ForgetPassword = React.lazy(() =>
  import("../Pages/Authentication/ForgotPassword/ForgotPassword")
);
const ForgotPasswordResetPassword = React.lazy(() =>
  import("../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword")
);
const ForgotPasswordAuthenticatorVerifier = React.lazy(() =>
  import(
    "../Pages/Authentication/ForgotPassword/ForgotPasswordAuthenticatorVerifier"
  )
);
const ForgotPasswordQuestionVerifier = React.lazy(() =>
  import(
    "../Pages/Authentication/ForgotPassword/ForgotPasswordQuestionVerifier"
  )
);

const Dashboard = React.lazy(() =>
  import("../Pages/Dashboard/TenantDashboard")
);
const Calendar = React.lazy(() =>
  import("../Pages/Scheduler/SchdedulerSubs/Calendar")
);
const Appointments = React.lazy(() =>
  import("../Pages/Scheduler/SchdedulerSubs/Appointments")
);
const StartAppointment = React.lazy(() =>
  import("../Pages/Scheduler/StartAppointment/StartAppointment")
);

const Pipeline = React.lazy(() => import("../Pages/Client/Pipeline/Pipeline"));
const ManageColumn = React.lazy(() =>
  import("./ManageColumn/ManageColumn")
);
const ClientPanel = React.lazy(() =>
  import("../Pages/Client/Pipeline/ClientPanel/ClientPanel")
);
const ClientList = React.lazy(() =>
  import("../Pages/Client/ClientList/ClientList")
);
const ViewPrograms = React.lazy(() =>
  import(
    "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ProgramSub/ViewPrograms"
  )
);

const ProgramLibrary = React.lazy(() =>
  import("../Pages/ProgramLibrary/ProgramLibrary")
);
const TargetSingle = React.lazy(() =>
  import("../Pages/ProgramLibrary/TargetSingle")
);

const General = React.lazy(() =>
  import("../Pages/Organisation/General/General")
);
const PracticeSettings = React.lazy(() =>
  import("../Pages/Organisation/PracticeSettings/PracticeSettings")
);
const StaffsAndTeams = React.lazy(() =>
  import("../Pages/Organisation/StaffAndTeams/StaffsAndTeams")
);
const SingleStaffByAdmin = React.lazy(() =>
  import("../Pages/Organisation/StaffAndTeams/SingleStaffByAdmin")
);
const RoleAndPermission = React.lazy(() =>
  import("../Pages/Organisation/RoleAndPermissions/RoleAndPermission")
);

const TimeSheet = React.lazy(() =>
  import("../Pages/BillingAndPayment/TimeSheet/TimeSheet")
);
const SingleTimeSheet = React.lazy(() =>
  import("../Pages/BillingAndPayment/TimeSheet/SingleTimeSheet")
);
const Claims = React.lazy(() =>
  import("../Pages/BillingAndPayment/Claims/Claims")
);
const SingleClaim = React.lazy(() =>
  import("../Pages/BillingAndPayment/Claims/SingleClaim")
);
const BillingSettings = React.lazy(() =>
  import("../Pages/BillingAndPayment/Settings/BillingSettings")
);
const SingleViewPayer = React.lazy(() =>
  import("../Pages/BillingAndPayment/Settings/SettingSubs/SingleViewPayer")
);

const Payroll = React.lazy(() => import("../Pages/Payroll/Payroll/Payroll"));
const PayrollSettings = React.lazy(() =>
  import("../Pages/Payroll/PayrollSetting/PayrollSettings")
);
const ViewBreakDown = React.lazy(() =>
  import("../Pages/Payroll/Payroll/ViewBreakDown")
);

const Forms = React.lazy(() => import("../Pages/CustomForms/Forms/Forms"));
const FormBuilder = React.lazy(() =>
  import("../Pages/CustomForms/Forms/FormBuilder")
);
const FormRenderer = React.lazy(() =>
  import("../Pages/CustomForms/FormRender/FormRenderer")
);
const TemplatesLibrary = React.lazy(() =>
  import("../Pages/CustomForms/TemplatesLibrary/TemplatesLibrary")
);

const Reports = React.lazy(() => import("../Pages/Reports/Reports"));

const SupportRequests = React.lazy(() =>
  import("../Pages/HelpAndSupport/SupportRequests/SupportRequests")
);
const KnowledgeBase = React.lazy(() =>
  import("../Pages/HelpAndSupport/KnowledgeBase/KnowledgeBase")
);
const ViewRequestDetails = React.lazy(() =>
  import("../Pages/HelpAndSupport/SupportRequests/ViewRequestDetails")
);

const Settings = React.lazy(() => import("../Pages/Settings/settings"));



const AllRoutes = () => {
  return (
    <Routes>
      {/* Public / Auth Routes - Available on root domain and subdomains */}
      <Route path="/" element={<AdminLogin />} />
      <Route
        path="/auth/2fa/login-authenticator"
        element={<Admin2FAAuthenticatorLogin />}
      />
      <Route
        path="/auth/2fa/login-question"
        element={<Admin2FAQuestionLogin />}
      />
      <Route path="/auth/initial-login" element={<InitialSuperLogin />} />
      <Route path="/auth/change-password" element={<SuperChangePassword />} />
      <Route path="/auth/2fa-settings" element={<SuperAdmin2FAChoice />} />
      <Route path="/auth/2fa/authenticator" element={<Authenticator2FA />} />
      <Route
        path="/auth/2fa/security-question"
        element={<QuestionAndAnswer2FA />}
      />
      <Route
        path="/auth/staff/onboarding/:email/:userId"
        element={<AdminOnboarding />}
      />
      <Route
        path="/auth/reset-password/:userId"
        element={<ForgotPasswordResetPassword />}
      />
      <Route path="/auth/forgot-password" element={<ForgetPassword />} />
      <Route
        path="/auth/forgot-password/2fa-auth-verify"
        element={<ForgotPasswordAuthenticatorVerifier />}
      />
      <Route
        path="/auth/forgot-password/2fa-question-verify"
        element={<ForgotPasswordQuestionVerifier />}
      />

      {/* Tenant-Only Routes - Will still render, but you can protect them with auth guards later */}
      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/scheduler/calendar" element={<Calendar />} />
      <Route path="/scheduler/appointments" element={<Appointments />} />
      <Route
        path="/appointments/start/:appointmentId/:clientId"
        element={<StartAppointment />}
      />

      <Route path="/clients/pipeline" element={<Pipeline />} />
      <Route
        path="/pipeline/column-single/:pipelineStageId"
        element={<ManageColumn />}
      />
      <Route
        path="/client/client-single/:clientId/:tenantClientId"
        element={<ClientPanel />}
      />
      <Route
        path="/client/view-client/:clientId/:tenantClientId"
        element={<ClientPanel />}
      />
      <Route
        path="/clinical-report/report-builder"
        element={<ClinicalReportBuilder />}
      />
      <Route
        path="/clinical-report/template-builder"
        element={<TemplateBuilder />}
      />
       <Route
        path="/clinical-report/audit-trails"
        element={<AuditTrails />}
      />
      <Route path="/clients/client-list" element={<ClientList />} />
      <Route
        path="/client/view-program/:clientId/target/:programId"
        element={<ViewPrograms />}
      />
      <Route
        path="/client/view-program/:clientId/target/:programId"
        element={<ViewPrograms />}
      />

      <Route path="/program-library" element={<ProgramLibrary />} />
      <Route
        path="/target-single/:domainName/:programName/:targetName"
        element={<TargetSingle />}
      />
      <Route
        path="/target-single/:programName/:targetName"
        element={<TargetSingle />}
      />

      <Route path="/organization/general" element={<General />} />
      <Route
        path="/organization/staff-and-teams"
        element={<StaffsAndTeams />}
      />
      <Route
        path="/organization/staff-and-teams/single-staff/:tenantStaffId"
        element={<SingleStaffByAdmin />}
      />
      <Route
        path="/organization/practice-settings"
        element={<PracticeSettings />}
      />
      <Route
        path="/organization/role-and-permissions"
        element={<RoleAndPermission />}
      />

      <Route path="/billing/timesheets" element={<TimeSheet />} />
      <Route
        path="/billing/timesheets/:timesheetId"
        element={<SingleTimeSheet />}
      />
      <Route path="/billing/claims" element={<Claims />} />
      <Route path="/billing/claims/view/:claimId" element={<SingleClaim />} />
      <Route path="/billing/settings" element={<BillingSettings />} />
      <Route
        path="/billing/settings/view-payer/:id/:payerName"
        element={<SingleViewPayer />}
      />

      <Route path="/payroll/payroll-setup" element={<Payroll />} />
      <Route
        path="/payroll/payroll/view-breakdown/:id"
        element={<ViewBreakDown />}
      />
      <Route path="/payroll/payroll-settings" element={<PayrollSettings />} />

      <Route path="/custom-forms/forms" element={<Forms />} />
      <Route path="/custom-forms/forms/create" element={<FormBuilder />} />
      <Route
        path="/custom-forms/forms/create/:formId"
        element={<FormBuilder />}
      />
      <Route
        path="/custom-forms/forms/renderer/:id"
        element={<FormRenderer />}
      />
      <Route
        path="/custom-forms/templates-library"
        element={<TemplatesLibrary />}
      />

      <Route path="/reports" element={<Reports />} />

      <Route path="/help/support-requests" element={<SupportRequests />} />
      <Route
        path="/help/support-requests/:requestId"
        element={<ViewRequestDetails />}
      />
      <Route path="/help/knowledge-base" element={<KnowledgeBase />} />

      <Route path="/settings" element={<Settings />} />

      {/* Optional: Redirect any unknown route to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AllRoutes;
