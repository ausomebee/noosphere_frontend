// src/Components/AllRoutes.jsx (or wherever your file is)
import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import LoadingSpinner from "../Components/LoadingSpinner"; // Adjust path if needed
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

      {/* Dashboard / App Routes */}
      <Route path="/dashboard" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/programs" element={<Programs />} />
      <Route path="/documents" element={<DocumentsAndForms />} />
      <Route
        path="/forms/renderer/:id"
        element={<FormRenderer />}
      />

      <Route path="/changePassword/:clientTenantId" element={<ChangePassword />} />
      {/* Optional: Catch-all redirect (uncomment if needed) */}
      {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
    </Routes>
  );
};

export default AllRoutes;
