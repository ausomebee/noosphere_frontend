// src/Components/AllRoutes.jsx (or wherever your file is)
import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import NotFound from "./NotFound";
import FormRenderer from "./FormRender/FormRenderer";

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


// Lazy load all page components
const ClientLogin = lazyWithReload(() =>
  import("../Pages/Authentication/Login/ClientLogin")
);
const IntialLogin = lazyWithReload(() =>
  import("../Pages/Authentication/NewClientLogin/IntialLogin")
);
const InitialResetPassword = lazyWithReload(() =>
  import("../Pages/Authentication/NewClientLogin/IntialResetPassword")
);
const InitialResetSuccessful = lazyWithReload(() =>
  import("../Pages/Authentication/NewClientLogin/IntialResetSuccessful")
);
const ForgotPassword = lazyWithReload(() =>
  import("../Pages/Authentication/ForgotPassword/ForgotPassword")
);
const CheckEmail = lazyWithReload(() =>
  import("../Pages/Authentication/ForgotPassword/CheckEmail")
);
const ChangePassword = lazyWithReload(() =>
  import("../Pages/Authentication/ForgotPassword/ChangePassword")
);

const Home = lazyWithReload(() => import("../Pages/Home/Home"));
const Profile = lazyWithReload(() => import("../Pages/Profile/Profile"));
const Notifications = lazyWithReload(() =>
  import("../Pages/Notification/Notifications")
);
const Programs = lazyWithReload(() => import("../Pages/Programs/Programs"));
const DocumentsAndForms = lazyWithReload(() =>
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

      {/* 404 catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AllRoutes;
