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

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/scheduler/calendar" element={<Calendar />} />
      <Route path="/scheduler/appointments" element={<Appointments />} />
    </Routes>
  );
};

export default AllRoutes;
