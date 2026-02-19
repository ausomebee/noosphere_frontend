// src/Components/AllRoutes.jsx (or wherever your file is)
import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoadingSpinner from "../Components/LoadingSpinner";
import ProtectedRoute from "./ProtectedRoute";
import FormRenderer from "./FormRender/FormRenderer";

// Lazy load all page components
const ClientLogin = React.lazy(() =>
  import("../Pages/Authentication/Login/ClientLogin")
);
const IntialLogin = React.lazy(() =>
  import("../Pages/Authentication/NewClientLogin/IntialLogin")
);
const InitialResetPassword = React.lazy(() =>
  import("../Pages/Authentication/NewClientLogin/IntialResetPassword")
);
const InitialResetSuccessful = React.lazy(() =>
  import("../Pages/Authentication/NewClientLogin/IntialResetSuccessful")
);
const ForgotPassword = React.lazy(() =>
  import("../Pages/Authentication/ForgotPassword/ForgotPassword")
);
const CheckEmail = React.lazy(() =>
  import("../Pages/Authentication/ForgotPassword/CheckEmail")
);
const ChangePassword = React.lazy(() =>
  import("../Pages/Authentication/ForgotPassword/ChangePassword")
);

const Home = React.lazy(() => import("../Pages/Home/Home"));
const Profile = React.lazy(() => import("../Pages/Profile/Profile"));
const Notifications = React.lazy(() =>
  import("../Pages/Notification/Notifications")
);
const Programs = React.lazy(() => import("../Pages/Programs/Programs"));
const DocumentsAndForms = React.lazy(() =>
  import("../Pages/DocumentsAndForms/DocumentsAndForms")
);

const AllRoutes = () => {
  return (
    <Routes>
      {/* Authentication Routes */}
      <Route path="/" element={<ClientLogin />} />
      <Route path="/intialLogin" element={<IntialLogin />} />
      <Route path="/forgotPassword" element={<ForgotPassword />} />
      <Route path="/checkEmail" element={<CheckEmail />} />
      <Route path="/intialResetPassword" element={<InitialResetPassword />} />
      <Route
        path="/intialResetSuccessful"
        element={<InitialResetSuccessful />}
      />

      {/* Dashboard / App Routes (Protected) */}
      <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentsAndForms /></ProtectedRoute>} />
      <Route path="/forms/renderer/:id" element={<ProtectedRoute><FormRenderer /></ProtectedRoute>} />

      <Route path="/changePassword/:clientTenantId" element={<ChangePassword />} />

      {/* Catch-all: redirect unknown routes to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AllRoutes;
