import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TenantSingle from '../Pages/Tenant/TenantSingle/TenantSingleAccOverview';
import TenantList from '../Pages/Tenant/TenantList/TenantList';
import SuperAdminLogin from '../Pages/Authentication/SuperAdminLogin';
import SuperAdminChangePassword from '../Pages/Authentication/SuperAdminChangePassword';
import SuperAdmin2FASettings from '../Pages/Authentication/SuperAdmin2FASettings';
import SuperAdmin2FAMicrosoftAuthenticator from '../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator';
import SuperAdmin2FAQuestion from '../Pages/Authentication/2FAQuestion/SuperAdmin2FAQuestion';
import SuperAdmin2FAQuestionLogin from '../Pages/Authentication/SuperAdmin2FAQuestionLogin';
import SuperAdmin2FAAuthenticatorLogin from '../Pages/Authentication/MicrosoftAuth/SuperAdmin2FAAuthenticatorLogin';
import ForgetPassword from '../Pages/Authentication/ForgotPassword/ForgotPassword';
import PasswordResetConfirmation from '../Pages/Authentication/ForgotPassword/ForgotPasswordConfirmation';
import SetNewPassword from '../Pages/Authentication/ForgotPassword/SetNewPassword';
import PasswordResetSuccess from '../Pages/Authentication/ForgotPassword/PasswordResetSuccessful';
import PasswordResetFailure from '../Pages/Authentication/ForgotPassword/PasswordResetFailed';
import AdminOnboarding from '../Pages/Authentication/AdminAuth/AdminOnboarding';
import TenantPipeline from '../Pages/Tenant/TenantPipeline/TenantPipeline';
import ProspectPanel from './ProspectPanel/ProspectPanel';
import ManageColumn from './ManageColumn/ManageColumn';
import TenantSingleFeature from '../Pages/Tenant/TenantSingle/TenantSingleFeature';
import TenantSingleBilling from '../Pages/Tenant/TenantSingle/TenantSingleBilling';
import TenantSingleIssueManagement from '../Pages/Tenant/TenantSingle/TenantSingleIssueManagment';
import TenantSingleUserLogs from '../Pages/Tenant/TenantSingle/TenantSingleUserLogs';
import TenantSingleSecuritySettings from '../Pages/Tenant/TenantSingle/TenantSingleSecuritySettings';
import FeatureManagement from '../Pages/FeatureManagment/FeatureManagement';
import ForgotPasswordResetPassword from '../Pages/Authentication/ForgotPassword/ForgotPasswordResetPassword';
import PlansAndPayment from '../Pages/BillingsAndPayment/PlansAndPayment';
import BillingManager from '../Pages/BillingsAndPayment/BillingManager';
import BillingReports from '../Pages/BillingsAndPayment/BillingReports';
import SubscriberList from '../Pages/BillingsAndPayment/SubcriberList';
import SubscriptionManager from '../Pages/BillingsAndPayment/BillingReport/SubcriptionManager/SubscriptionManager';
import AutoBilling from '../Pages/BillingsAndPayment/BillingReport/AutoBilling/AutoBilling';
import MainPerformance from '../Pages/Performance/MainPerformance';
import IssueManagement from '../Pages/IssueManagement/IssueManagement';
import ControlSettings from '../Pages/Settings/ControlSettings';

const AllRoutes = () => {
  return (
    
      <Routes>
      {/* Authentication */}
        <Route path="/" element={<SuperAdminLogin />} />
        <Route path="/SA/change-password" element={<SuperAdminChangePassword />} />
        <Route path="/SA/2fa-settings" element={<SuperAdmin2FASettings/>} />
        <Route path="/2fa/authenticator" element={<SuperAdmin2FAMicrosoftAuthenticator/>} />
        <Route path="/2fa/security-question" element={<SuperAdmin2FAQuestion/>} />
        <Route path="/SA/2fa-question/login" element={<SuperAdmin2FAQuestionLogin/>} />
        <Route path="/SA/2fa-authentication/login" element={<SuperAdmin2FAAuthenticatorLogin/>} />
        <Route path="/forgot-password" element={<ForgetPassword/>} />
        <Route path="/password-reset-confirmation" element={<PasswordResetConfirmation/>} />
        <Route path="/password-reset-successful" element={<PasswordResetSuccess/>} />
        <Route path="/password-reset-failed" element={<PasswordResetFailure/>} />
        <Route path="/SA/reset-password/:userId" element={<ForgotPasswordResetPassword />} />
        <Route path="/admin/onboarding/:email/:userId" element={<AdminOnboarding/>} />

{/* Tenant Management */}
        <Route path="/tenants/tenant-list" element={<TenantList />} />
        <Route path="/tenants/tenant-lists/overview/:tenantId" element={<TenantSingle />} />
        <Route path="/tenants/pipeline" element={<TenantPipeline/>} />
        <Route 
  path="/tenants/candidate-single/:pipelineStageId/:pipelineItemId" 
  element={<ProspectPanel />} 
/>
<Route 
  path="/tenants/candidate-single/:pipelineStageId/:pipelineItemId/edit" 
  element={<ProspectPanel />} 
/>
        <Route path="/tenants/column-single/:pipelineStageId" element={<ManageColumn/>} />
        <Route path="/tenants/tenant-lists/features" element={< TenantSingleFeature/>} />
        <Route path="/tenants/tenant-lists/billing" element={<TenantSingleBilling />} />
        <Route path="/plans/subscribers/:planId" element={<SubscriberList />} />
        <Route path="/tenants/tenant-lists/issues" element={<TenantSingleIssueManagement/>} />
        <Route path="/tenants/tenant-lists/logs" element={<TenantSingleUserLogs />} />
        <Route path="/tenants/tenant-lists/security" element={<TenantSingleSecuritySettings />} />


        <Route path="/performance" element={<MainPerformance />} />
        <Route path="/billing-payments/plans-pricing" element={<PlansAndPayment />} />
        <Route path="/billing-payments/invoice-payments" element={<BillingManager />} />
        <Route path="/billing-payments/subscription-manager" element={<SubscriptionManager />} />
        <Route path="/billing-payments/auto-billing-settings" element={<AutoBilling />} />
        <Route path="/billing-payments/Reports" element={<BillingReports />} />

        <Route path="/issues" element={<IssueManagement />} />
        
{/* Feature Management */}
        <Route path="/features" element={<FeatureManagement />} />

        <Route path="/settings/roles-permissions" element={<ControlSettings />} />
        <Route path="/settings/notification-alerts" element={<div>Notification & Alerts Page</div>} />
        <Route path="/settings/securitySettings" element={<div>Security Settings Page</div>} />
        {/* Secondary sidebar routes */}
       
      </Routes>
  
  );
};

export default AllRoutes;