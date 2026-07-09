import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextInput, PasswordInput } from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import Logo from "../../assets/NoosphereLogo-white.png";
import { useNavigate } from "react-router-dom";
import "./SuperAdmin.css";
import { AdminLogin } from "../../ReduxStore/features/authentication";
import { useDispatch } from "react-redux";
import useAuth from "../../hooks/useAuth";
import { showToast } from "../../Helper/ShowToast";
import api from "../../api/authApis";

// Yup validation schema
const schema = yup.object().shape({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters")
    
});

const AdminsLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });
  const { loading } = useAuth();

  const handleGetSuperAdminChoice = async () => {
    try {
      const response = await api.GetSuperAdminChoices();
      const { setForAll, Authenticator2FA, securityQuestion, isEnabled } = response.data.data;
      return { setForAll, Authenticator2FA, securityQuestion, isEnabled };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching SuperAdmin choices:", error);
      // Default isEnabled to true on failure so 2FA is never silently skipped.
      return { setForAll: false, Authenticator2FA: false, securityQuestion: false, isEnabled: true };
    }
  };

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(AdminLogin(data));

      if (AdminLogin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Login successful", "success");

        // Determine the effective auth type: the super-admin's global choice
        // when "set for all" is on, otherwise the user's own auth type.
        const { setForAll, Authenticator2FA, securityQuestion, isEnabled } =
          await handleGetSuperAdminChoice();

        // Master switch: when 2FA is disabled, skip it and go to the dashboard.
        if (isEnabled === false) {
          navigate("/tenants/pipeline");
          return;
        }

        const choiceType = Authenticator2FA
          ? "AUTHENTICATOR"
          : securityQuestion
          ? "SECRETMESSAGE"
          : null;
        const isPrivileged = !!user.superAdmin;
        // When "set for all" is on, everyone uses the global chosen type;
        // otherwise each user falls back to their own (self-chosen) type.
        const effectiveType = setForAll ? choiceType : user.authType || null;

        if (!user.auth2FADone) {
          // Forced (re)setup: a type is set but the user hasn't completed 2FA
          // (first time, or the super admin just changed the type for all).
          if (effectiveType === "AUTHENTICATOR") {
            navigate("/2fa/authenticator");
          } else if (effectiveType === "SECRETMESSAGE") {
            navigate("/2fa/security-question");
          } else if (isPrivileged) {
            // Brand-new super admin, no type chosen yet → password onboarding.
            navigate("/SA/change-password");
          } else {
            // setForAll is off and this admin has no type yet → let them pick.
            navigate("/2fa/choice");
          }
        } else {
          // Already set up → verify with the chosen method.
          if (effectiveType === "AUTHENTICATOR") {
            navigate("/SA/2fa-authentication/login");
          } else if (effectiveType === "SECRETMESSAGE") {
            navigate("/SA/2fa-question/login");
          } else {
            navigate("/tenants/pipeline");
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
      if (import.meta.env.DEV) console.error("Unexpected error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    }
  };

  const forgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Administrator Sign on</h2>
        <p className="subtitle">
          Please enter the details sent to you via email
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <TextInput
              required
              label="Email"
              id="email"
              type="email"
              placeholder="olivia@therapyco.com"
              {...register("email")}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && (
              <p className="error-message">{errors.email.message}</p>
            )}
          </div>

          <div className="form-group">
            <PasswordInput
              required
              label="Password"
              id="password"
              placeholder="Enter password"
              {...register("password")}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && (
              <p className="error-message">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            label="Continue"
            variant="primary"
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
  );
};

export default AdminsLogin;