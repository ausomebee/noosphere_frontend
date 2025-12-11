import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import IntialLogin from "../Pages/Authentication/NewClientLogin/IntialLogin";
import InitialResetPassword from "../Pages/Authentication/NewClientLogin/IntialResetPassword";
import InitialResetSuccessful from "../Pages/Authentication/NewClientLogin/IntialResetSuccessful";
import ClientLogin from "../Pages/Authentication/Login/ClientLogin";
import ForgotPassword from "../Pages/Authentication/ForgotPassword/ForgotPassword";
import CheckEmail from "../Pages/Authentication/ForgotPassword/CheckEmail";
import ChangePassword from "../Pages/Authentication/ForgotPassword/ChangePassword";
import Home from "../Pages/Home/Home";
import Profile from "../Pages/Profile/Profile";
import Notifications from "../Pages/Notification/Notifications";
import Programs from "../Pages/Programs/Programs";
import DocumentsAndForms from "../Pages/DocumentsAndForms/DocumentsAndForms";


const AllRoutes = () => {
  return (
    <Routes>
      {/* Authentication */}

      <Route path="/" element={<ClientLogin />} />
      <Route path="/intialLogin" element={<IntialLogin />} />
      <Route path="/forgotPassword" element={<ForgotPassword />} />
      <Route path="/checkEmail" element={<CheckEmail />} />
      <Route path="/changePassword" element={<ChangePassword />} />
      <Route path="/intialResetPassword" element={<InitialResetPassword />} />
      <Route
        path="/intialResetSuccessful"
        element={<InitialResetSuccessful />}
      />

      {/* Dashboard Routes */}
      <Route path="/dashboard" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/programs" element={<Programs />} />
      <Route path="/documents" element={<DocumentsAndForms />} />
    </Routes>
  );
};

export default AllRoutes;
