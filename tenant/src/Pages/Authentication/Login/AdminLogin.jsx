import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import { showToast } from "../../../Helper/ShowToast";
import api from "../../../api/authApis";
import { AdminLogin } from "../../../ReduxStore/features/authentication";
import { connectSocket } from "../../../api/socketService";
import "../Auth.css";
import TenantLogo from "../../../assets/Logo.svg";
import { PasswordInput, TextInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";

// Yup validation schema
const schema = yup.object().shape({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const AdminCLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
  });
  const { loading } = useAuth();

  const handleGetSuperAdminChoice = async (id) => {
    try {
      const response = await api.GetSuperAdminChoices({ id });
      const { setForAll, Authenticator2FA, securityQuestion, isEnabled } =
        response.data.data;
      return { setForAll, Authenticator2FA, securityQuestion, isEnabled };
    } catch (error) {
      console.error("Error fetching SuperAdmin choices:", error);
      return {
        setForAll: false,
        Authenticator2FA: false,
        securityQuestion: false,
        // Default isEnabled to true on failure so 2FA is never silently skipped.
        isEnabled: true,
      };
    }
  };

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(AdminLogin(data));

      if (AdminLogin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Login successful", "success");

        // Determine the effective auth type: the admin's global choice when
        // "set for all" is on, otherwise the privileged user's own auth type.
        const { setForAll, Authenticator2FA, securityQuestion, isEnabled } =
          await handleGetSuperAdminChoice(user.tenantId);
        const choiceType = Authenticator2FA
          ? "AUTHENTICATOR"
          : securityQuestion
          ? "SECRETMESSAGE"
          : null;
        const isPrivileged = user.role?.name === "Admin";
        // When "set for all" is on, everyone uses the org's chosen type;
        // otherwise each user falls back to their own (self-chosen) type.
        const effectiveType = setForAll ? choiceType : user.authType || null;

        const goDashboard = () => {
          connectSocket({
            accessToken: user.accessToken,
            userId: user.id,
            tenantId: user.tenantId,
          });
          navigate("/dashboard");
        };

        // Master switch: when 2FA is disabled, skip it and go to the dashboard.
        if (isEnabled === false) {
          goDashboard();
          return;
        }

        if (!user.auth2FADone) {
          // Forced (re)setup: a type is set but 2FA isn't complete (first time,
          // or the admin just changed the type for all).
          if (effectiveType === "AUTHENTICATOR") {
            navigate("/auth/2fa/authenticator");
          } else if (effectiveType === "SECRETMESSAGE") {
            navigate("/auth/2fa/security-question");
          } else if (isPrivileged) {
            // Brand-new admin, no type chosen yet → password onboarding.
            navigate("/auth/change-password");
          } else {
            // setForAll is off and this user has no type yet → let them pick
            // their own 2FA method.
            navigate("/auth/2fa/choice");
          }
        } else {
          // Already set up → verify with the chosen method.
          if (effectiveType === "AUTHENTICATOR") {
            navigate("/auth/2fa/login-authenticator");
          } else if (effectiveType === "SECRETMESSAGE") {
            navigate("/auth/2fa/login-question");
          } else {
            goDashboard();
          }
        }
      } else {
        // The thunk rejects with the backend message string, so read the
        // payload directly; fall back to a generic message.
        const errorMessage =
          resultAction.payload?.message || resultAction.payload || "Login failed";
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    }
  };

  const forgotPassword = () => {
    navigate("/auth/forgot-password");
  };

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="auth-logo-container">
          <img src={TenantLogo} alt="Logo" className="logo" />
        </div>
        <div className="main-container">
          <div className="content-wrapper">
            <div className="items-center justify-center flex promo-wrapper">
              <div className="promo-section">
                <h1><span className="hero-line">The all-in-one ABA</span><span className="hero-line">Practice Management</span><span className="hero-line">Solution</span></h1>
              </div>
            </div>
            <div className="login-wrapper">
              <div className="login-section">
                <h2>Welcome Back</h2>
                <p>Please login to your account</p>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-24">
                  <TextInput
                    required
                    label="Email"
                    placeholder="Enter your mail"
                    className="p-4"
                    {...register("email")}
                    error={errors.email?.message}
                  />
                  </div>
                  <PasswordInput
                    required
                    label="Password"
                    placeholder="Enter your Password"
                    {...register("password")}
                    error={errors.password?.message}
                  />
                  <Button
                    label="Continue"
                    variant="primary"
                    size="large"
                    className="w-full mt-4"
                    type="submit"
                    loading={loading}
                  />
                  <p className="cant-access">
                    <a href="#" onClick={forgotPassword}>
                      Forgot Password?
                    </a>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCLogin;
