import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import LayoutRoute from "./LayoutRoute";
import ProtectedRoute from "./ProtectedRoute";
import FullPageLoader from "./FullPageLoader";
import NotFound from "./NotFound";

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

/* ============================
   Authentication (public, no layout) — keep lazy since they're a separate flow
============================ */
const TenantSingle = lazyWithReload(() => import("../Pages/Tenant/TenantSingle/TenantSingleAccOverview"));
const SuperAdminLogin = lazyWithReload(() => import("../Pages/Authentication/SuperAdminLogin"));
const SuperAdminChangePassword = lazyWithReload(() => import("../Pages/Authentication/SuperAdminChangePassword"));
const AdministrativePassword = lazyWithReload(() => import("../Pages/Authentication/AdministrativePassword"));
const Admin2FAChoice = lazyWithReload(() => import("../Pages/Authentication/Admin2FAChoice"));
const SuperAdmin2FASettings = lazyWithReload(() => import("../Pages/Authentication/SuperAdmin2FASettings"));
const SuperAdmin2FAMicrosoftAuthenticator = lazyWithReload(() => import("../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator"));
const SuperAdmin2FAQuestion = lazyWithReload(() => import("../Pages/Authentication/2FAQuestion/SuperAdmin2FAQuestion"));
const SuperAdmin2FAQuestionLogin = lazyWithReload(() => import("../Pages/Authentication/SuperAdmin2FAQuestionLogin"));
const SuperAdmin2FAAuthenticatorLogin = lazyWithReload(() => import("../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAAuthenticatorLogin"));
const ForgetPassword = lazyWithReload(() => import("../Pages/Authentication/ForgotPassword/ForgotPassword"));
const PasswordResetConfirmation = lazyWithReload(() => import("../Pages/Authentication/ForgotPassword/ForgotPasswordConfirmation"));
const SetNewPassword = lazyWithReload(() => import("../Pages/Authentication/ForgotPassword/SetNewPassword"));
const PasswordResetSuccess = lazyWithReload(() => import("../Pages/Authentication/ForgotPassword/PasswordResetSuccessful"));
const PasswordResetFailure = lazyWithReload(() => import("../Pages/Authentication/ForgotPassword/PasswordResetFailed"));
const ForgotPasswordResetPassword = lazyWithReload(() => import("../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword"));
const AdminOnboarding = lazyWithReload(() => import("../Pages/Authentication/AdminAuth/AdminOnboarding"));
const PaymentPage = lazyWithReload(() => import("../Pages/Payment/PaymentPage"));

/* ============================
   Dashboard (protected, with layout) — eager imports for instant navigation
============================ */
import TenantList from "../Pages/Tenant/TenantList/TenantList";

import TenantPipeline from "../Pages/Tenant/TenantPipeline/TenantPipeline";
import ProspectPanel from "./ProspectPanel/ProspectPanel";
import ManageColumn from "./ManageColumn/ManageColumn";
import TenantSingleFeature from "../Pages/Tenant/TenantSingle/TenantSingleFeature";
import TenantSingleBilling from "../Pages/Tenant/TenantSingle/TenantSingleBilling";
import TenantSingleIssueManagement from "../Pages/Tenant/TenantSingle/TenantSingleIssueManagement";
import TenantSingleUserLogs from "../Pages/Tenant/TenantSingle/TenantSingleUserLogs";
import TenantSingleSecuritySettings from "../Pages/Tenant/TenantSingle/TenantSingleSecuritySettings";
import TenantListUsageStatistics from "../Pages/Tenant/TenantList/TenantListUsageStatistics";
import FeatureManagement from "../Pages/FeatureManagement/FeatureManagement";
import PlansAndPayment from "../Pages/BillingsAndPayment/PlansAndPayment";
import BillingManager from "../Pages/BillingsAndPayment/BillingManager";
import BillingReports from "../Pages/BillingsAndPayment/BillingReports";
import SubscriberList from "../Pages/BillingsAndPayment/SubscriberList";
import SubscriptionManager from "../Pages/BillingsAndPayment/BillingReport/SubscriptionManager/SubscriptionManager";
import AutoBilling from "../Pages/BillingsAndPayment/BillingReport/AutoBilling/AutoBilling";
import MainPerformance from "../Pages/Performance/MainPerformance";
import IssueManagement from "../Pages/IssueManagement/IssueManagement";
import ControlSettings from "../Pages/Settings/ControlSettings";
import SecuritySettings from "../Pages/Settings/SecuritySettings";
import RoleConfiguration from "../Pages/Settings/SettingsSubs/RoleConfiguration";

const AllRoutes = () => {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* Authentication (no layout) */}
        <Route path="/" element={<SuperAdminLogin />} />
        <Route path="/SA/change-password" element={<SuperAdminChangePassword />} />
        <Route path="/SA/administrative-password" element={<AdministrativePassword />} />
        <Route path="/SA/2fa-settings" element={<SuperAdmin2FASettings />} />
        <Route path="/2fa/choice" element={<Admin2FAChoice />} />
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
          <Route path="/tenants/tenant-lists/usage-statistics/:tenantId" element={<TenantListUsageStatistics />} />
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

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AllRoutes;
