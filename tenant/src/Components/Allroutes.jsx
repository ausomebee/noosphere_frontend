import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "../Pages/Dashboard/TenantDashboard";
import Calendar from "../Pages/Scheduler/SchdedulerSubs/Calendar";
import Appointments from "../Pages/Scheduler/SchdedulerSubs/Appointments";
import InitialSuperLogin from "../Pages/Authentication/AuthOnboarding/SuperAdmin/InitialSuperLogin";
import SuperChangePassword from "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperChangePassword";
import SuperAdmin2FAChoice from "../Pages/Authentication/AuthOnboarding/SuperAdmin/SuperAdmin2FAChoice";
import Authenticator2FA from "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/Authenticator2FA";
import QuestionAndAnswer2FA from "../Pages/Authentication/AuthOnboarding/SuperAdmin/Admin2FAs/QuestionAndAnswer2FA";
import AdminLogin from "../Pages/Authentication/Login/AdminLogin";
import Admin2FAQuestionLogin from "../Pages/Authentication/Login/Admin2FAQuestionLogin";
import Admin2FAAuthenticatorLogin from "../Pages/Authentication/Login/Admin2FAAuthenticatorLogin.";
import AdminOnboarding from "../Pages/Authentication/AuthOnboarding/Admin/AdminOnboarding";
import ForgetPassword from "../Pages/Authentication/ForgotPassword/ForgotPassword";
import ForgotPasswordResetPassword from "../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword";
import ForgotPasswordAuthenticatorVerifier from "../Pages/Authentication/ForgotPassword/ForgotPasswordAuthenticatorVerifier";
import ForgotPasswordQuestionVerifier from "../Pages/Authentication/ForgotPassword/ForgotPasswordQuestionVerifier";
import ProgramLibrary from "../Pages/ProgramLibrary/ProgramLibrary";
import Pipeline from "../Pages/Client/Pipeline/Pipeline";
import ManageColumn from "./ManageColumn/ManageColumn";
import ClientPanel from "../Pages/Client/Pipeline/ClientPanel/ClientPanel";
import TargetSingle from "../Pages/ProgramLibrary/TargetSingle";
import General from "../Pages/Organisation/General/General";
import PracticeSettings from "../Pages/Organisation/PracticeSettings/PracticeSettings";
import StaffsAndTeams from "../Pages/Organisation/StaffAndTeams/StaffsAndTeams";
import SingleStaffByAdmin from "../Pages/Organisation/StaffAndTeams/SingleStaffByAdmin";
import RoleAndPermission from "../Pages/Organisation/RoleAndPermissions/RoleAndPermission";
import TimeSheet from "../Pages/BillingAndPayment/TimeSheet/TimeSheet";
import Claims from "../Pages/BillingAndPayment/Claims/Claims";
import BillingSettings from "../Pages/BillingAndPayment/Settings/BillingSettings";
import SingleTimeSheet from "../Pages/BillingAndPayment/TimeSheet/SingleTimeSheet";
import SingleClaim from "../Pages/BillingAndPayment/Claims/SingleClaim";
import SingleViewPayer from "../Pages/BillingAndPayment/Settings/SettingSubs/SingleViewPayer";
import Payroll from "../Pages/Payroll/Payroll/Payroll";
import PayrollSettings from "../Pages/Payroll/PayrollSetting/PayrollSettings";
import ViewBreakDown from "../Pages/Payroll/Payroll/ViewBreakDown";
import Forms from "../Pages/CustomForms/Forms/Forms";
import TemplatesLibrary from "../Pages/CustomForms/TemplatesLibrary/TemplatesLibrary";
import FormBuilder from "../Pages/CustomForms/Forms/FormBuilder";
import FormRenderer from "../Pages/CustomForms/FormRender/FormRenderer";
import ClientList from "../Pages/Client/ClientList/ClientList";
import ViewPrograms from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ProgramSub/ViewPrograms";
import Reports from "../Pages/Reports/Reports";

const AllRoutes = () => {
  return (
    <Routes>
      {/* Authentication */}

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

      {/* Dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Schdeduler */}
      <Route path="/scheduler/calendar" element={<Calendar />} />
      <Route path="/scheduler/appointments" element={<Appointments />} />

      {/* Clients Onboarding*/}
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


      {/* Clients Onboarding*/}
      <Route path="/clients/client-list" element={<ClientList />} />
    
      <Route
        path="/client/view-program/:clientId/target/:programId"
        element={<ViewPrograms />}
      />

      {/* Program Library */}
      <Route path="/program-library" element={<ProgramLibrary />} />
      <Route
        path="/target-single/:domainName/:programName/:targetName"
        element={<TargetSingle />}
      />
      <Route
        path="/target-single/:programName/:targetName"
        element={<TargetSingle />}
      />

      {/* Organization */}
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

      {/* Billing and Payment */}
      <Route path="/billing/timesheets" element={<TimeSheet />} />
      <Route path="/billing/timesheets/:id" element={<SingleTimeSheet />} />
      <Route path="/billing/claims" element={<Claims />} />
      <Route path="/billing/claims/view/:id" element={<SingleClaim />} />
      <Route path="/billing/settings" element={<BillingSettings />} />
      <Route path="/billing/settings/view-payer/:id/:payerName" element={<SingleViewPayer />} />

      {/* Payroll */}
      <Route path="/payroll/payroll-setup" element={<Payroll />} />
      <Route path="/payroll/payroll/view-breakdown/:id" element={<ViewBreakDown />} />
      <Route path="/payroll/payroll-settings" element={<PayrollSettings />} />

      {/* Custom Forms */}
      <Route path="/custom-forms/forms" element={<Forms />} />
      <Route path="/custom-forms/forms/create" element={<FormBuilder />} />
      <Route path="/custom-forms/forms/create/:formId" element={<FormBuilder />} />
      <Route path="/custom-forms/forms/renderer/:id" element={<FormRenderer />} />
      <Route path="/custom-forms/templates-library" element={<TemplatesLibrary />} />
      

      {/* Reports */}
         <Route path="/reports" element={<Reports/>} />
    </Routes>
  );
};

export default AllRoutes;
