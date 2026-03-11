import React, { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import LayoutRoute from "./LayoutRoute";
import ProtectedRoute from "./ProtectedRoute";
import LoadingSpinner from "./LoadingSpinner";

/* ============================
   Authentication (public, no layout)
============================ */
const SuperAdminLogin = lazy(() => import("../Pages/Authentication/SuperAdminLogin"));
const SuperAdminChangePassword = lazy(() => import("../Pages/Authentication/SuperAdminChangePassword"));
const SuperAdmin2FASettings = lazy(() => import("../Pages/Authentication/SuperAdmin2FASettings"));
const SuperAdmin2FAMicrosoftAuthenticator = lazy(() => import("../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator"));
const SuperAdmin2FAQuestion = lazy(() => import("../Pages/Authentication/2FAQuestion/SuperAdmin2FAQuestion"));
const SuperAdmin2FAQuestionLogin = lazy(() => import("../Pages/Authentication/SuperAdmin2FAQuestionLogin"));
const SuperAdmin2FAAuthenticatorLogin = lazy(() => import("../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAAuthenticatorLogin"));
const ForgetPassword = lazy(() => import("../Pages/Authentication/ForgotPassword/ForgotPassword"));
const PasswordResetConfirmation = lazy(() => import("../Pages/Authentication/ForgotPassword/ForgotPasswordConfirmation"));
const SetNewPassword = lazy(() => import("../Pages/Authentication/ForgotPassword/SetNewPassword"));
const PasswordResetSuccess = lazy(() => import("../Pages/Authentication/ForgotPassword/PasswordResetSuccessful"));
const PasswordResetFailure = lazy(() => import("../Pages/Authentication/ForgotPassword/PasswordResetFailed"));
const ForgotPasswordResetPassword = lazy(() => import("../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword"));
const AdminOnboarding = lazy(() => import("../Pages/Authentication/AdminAuth/AdminOnboarding"));
const PaymentPage = lazy(() => import("../Pages/Payment/PaymentPage"));

/* ============================
   Dashboard (protected, with layout)
============================ */
const TenantList = lazy(() => import("../Pages/Tenant/TenantList/TenantList"));
const TenantSingle = lazy(() => import("../Pages/Tenant/TenantSingle/TenantSingleAccOverview"));
const TenantPipeline = lazy(() => import("../Pages/Tenant/TenantPipeline/TenantPipeline"));
const ProspectPanel = lazy(() => import("./ProspectPanel/ProspectPanel"));
const ManageColumn = lazy(() => import("./ManageColumn/ManageColumn"));
const TenantSingleFeature = lazy(() => import("../Pages/Tenant/TenantSingle/TenantSingleFeature"));
const TenantSingleBilling = lazy(() => import("../Pages/Tenant/TenantSingle/TenantSingleBilling"));
const TenantSingleIssueManagement = lazy(() => import("../Pages/Tenant/TenantSingle/TenantSingleIssueManagement"));
const TenantSingleUserLogs = lazy(() => import("../Pages/Tenant/TenantSingle/TenantSingleUserLogs"));
const TenantSingleSecuritySettings = lazy(() => import("../Pages/Tenant/TenantSingle/TenantSingleSecuritySettings"));
const FeatureManagement = lazy(() => import("../Pages/FeatureManagement/FeatureManagement"));
const PlansAndPayment = lazy(() => import("../Pages/BillingsAndPayment/PlansAndPayment"));
const BillingManager = lazy(() => import("../Pages/BillingsAndPayment/BillingManager"));
const BillingReports = lazy(() => import("../Pages/BillingsAndPayment/BillingReports"));
const SubscriberList = lazy(() => import("../Pages/BillingsAndPayment/SubscriberList"));
const SubscriptionManager = lazy(() => import("../Pages/BillingsAndPayment/BillingReport/SubscriptionManager/SubscriptionManager"));
const AutoBilling = lazy(() => import("../Pages/BillingsAndPayment/BillingReport/AutoBilling/AutoBilling"));
const MainPerformance = lazy(() => import("../Pages/Performance/MainPerformance"));
const IssueManagement = lazy(() => import("../Pages/IssueManagement/IssueManagement"));
const ControlSettings = lazy(() => import("../Pages/Settings/ControlSettings"));
const SecuritySettings = lazy(() => import("../Pages/Settings/SecuritySettings"));
const RoleConfiguration = lazy(() => import("../Pages/Settings/SettingsSubs/RoleConfiguration"));

const AllRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Authentication (no layout) */}
        <Route path="/" element={<SuperAdminLogin />} />
        <Route path="/SA/change-password" element={<SuperAdminChangePassword />} />
        <Route path="/SA/2fa-settings" element={<SuperAdmin2FASettings />} />
        <Route path="/2fa/authenticator" element={<SuperAdmin2FAMicrosoftAuthenticator />} />
        <Route path="/2fa/security-question" element={<SuperAdmin2FAQuestion />} />
        <Route path="/SA/2fa-question/login" element={<SuperAdmin2FAQuestionLogin />} />
        <Route path="/SA/2fa-authentication/login" element={<SuperAdmin2FAAuthenticatorLogin />} />
        <Route path="/forgot-password" element={<ForgetPassword />} />
        <Route path="/password-reset-confirmation" element={<PasswordResetConfirmation />} />
        <Route path="/password-reset-successful" element={<PasswordResetSuccess />} />
        <Route path="/password-reset-failed" element={<PasswordResetFailure />} />
        <Route path="/SA/reset-password/:userId" element={<ForgotPasswordResetPassword />} />
        <Route path="/admin/onboarding/:email/:userId" element={<AdminOnboarding />} />
        <Route path="/payment/:token" element={<PaymentPage />} />

        {/* Dashboard routes (protected, with layout) */}
        <Route element={<ProtectedRoute><LayoutRoute /></ProtectedRoute>}>
          {/* Tenant Management */}
          <Route path="/tenants/tenant-list" element={<TenantList />} />
          <Route path="/tenants/tenant-lists/overview/:tenantId" element={<TenantSingle />} />
          <Route path="/tenants/pipeline" element={<TenantPipeline />} />
          <Route path="/tenants/candidate-single/:pipelineStageId/:pipelineItemId" element={<ProspectPanel />} />
          <Route path="/tenants/candidate-single/:pipelineStageId/:pipelineItemId/edit" element={<ProspectPanel />} />
          <Route path="/tenants/column-single/:pipelineStageId" element={<ManageColumn />} />
          <Route path="/tenants/tenant-lists/features/:tenantId" element={<TenantSingleFeature />} />
          <Route path="/tenants/tenant-lists/billing/:tenantId" element={<TenantSingleBilling />} />
          <Route path="/tenants/tenant-lists/issues/:tenantId" element={<TenantSingleIssueManagement />} />
          <Route path="/tenants/tenant-lists/logs/:tenantId" element={<TenantSingleUserLogs />} />
          <Route path="/tenants/tenant-lists/security/:tenantId" element={<TenantSingleSecuritySettings />} />
          <Route path="/plans/subscribers/:planId" element={<SubscriberList />} />

          {/* Performance */}
          <Route path="/performance" element={<MainPerformance />} />

          {/* Billing & Payments */}
          <Route path="/billing-payments/plans-pricing" element={<PlansAndPayment />} />
          <Route path="/billing-payments/invoice-payments" element={<BillingManager />} />
          <Route path="/billing-payments/subscription-manager" element={<SubscriptionManager />} />
          <Route path="/billing-payments/auto-billing-settings" element={<AutoBilling />} />
          <Route path="/billing-payments/Reports" element={<BillingReports />} />

          {/* Issues & Features */}
          <Route path="/issues" element={<IssueManagement />} />
          <Route path="/features" element={<FeatureManagement />} />

          {/* Settings */}
          <Route path="/settings/roles-permissions" element={<ControlSettings />} />
          <Route path="/settings/roles-permissions/configure" element={<RoleConfiguration />} />
          <Route path="/settings/roles-permissions/configure/:roleId" element={<RoleConfiguration />} />
          <Route path="/settings/securitySettings" element={<SecuritySettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AllRoutes;
