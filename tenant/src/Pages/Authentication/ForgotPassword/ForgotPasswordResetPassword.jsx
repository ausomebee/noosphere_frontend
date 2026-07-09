import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import TenantLogo from "../../../assets/Logo.svg";
import { useNavigate, useParams } from "react-router-dom";
import "../../Authentication/Auth.css";
import api from "../../../api/authApis";
import { showToast } from "../../../Helper/ShowToast";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../Helper/passwordValidation";

// Yup schema. Confirm is held to the same strength rules as the new password.
const schema = yup.object().shape({
  newPassword: passwordSchema("New password"),
  confirmPassword: confirmPasswordSchema("newPassword"),
});

const ForgotPasswordResetPassword = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const handleGetSuperAdminChoice = async (id) => {
    try {
      const response = await api.GetSuperAdminChoices({ id });
      const { setForAll } = response.data.data;
      return { setForAll };
    } catch (error) {
      console.error("Error fetching SuperAdmin choices:", error);
      return { setForAll: false };
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const response = await api.AdminSetPassword({
        id: userId,
        password: data.newPassword,
      });

      showToast(
        response?.data?.message || "Password updated successfully!",
        "success"
      );
      const user = response.data.data;
      const { setForAll } = await handleGetSuperAdminChoice(user.tenantId);
      const { authType, auth2FADone, authQuestion } = response.data.data; // Use setPassword response

      if (setForAll && !auth2FADone) {
       if (authType === "AUTHENTICATOR") {
          navigate("/auth/2fa/authenticator", { state: { userId } });
        } else if (authType === "SECRETMESSAGE") {
          navigate("/auth/2fa/security-question", { state: { userId, authQuestion } });
        } else {
          console.error("Unknown authType:", authType);
          showToast("Unknown authentication type", "error");
        }
      } else if (!setForAll && !auth2FADone) {
        navigate("/");
      } else if (setForAll && auth2FADone) {
           if (authType === "AUTHENTICATOR") {
          navigate("/auth/forgot-password/2fa-auth-verify", { state: { userId } });
        } else if (authType === "SECRETMESSAGE") {
          navigate("/auth/forgot-password/2fa-question-verify", { state: { userId, authQuestion } });
        } else {
          console.error("Unknown authType:", authType);
          showToast("Unknown authentication type", "error");
        }
      }
    } catch (error) {
      console.error("Password update error:", error);
      const message =
        error?.response?.data?.message || "Failed to update password.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="auth-logo-container">
          <img src={TenantLogo} alt="Logo" className="logo" />
        </div>
        <div className="main-container">
          <div className="content-wrapper">
            <div className="promo-section">
              <h1><span className="hero-line">The all-in-one ABA</span><span className="hero-line">Practice Management</span><span className="hero-line">Solution</span></h1>
            </div>
            <div className="login-section">
              <h2>Set a new Password</h2>
              <p className="subtitle">Please create a new password</p>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group">
                  <PasswordInput
                    label="Password"
                    id="newPassword"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    showStrength
                    {...register("newPassword")}
                    className={errors.newPassword ? "input-error" : ""}
                  />
                  {errors.newPassword && (
                    <p className="error-message">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <PasswordInput
                    label="Confirm password"
                    id="confirmPassword"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    matchValue={watch("newPassword") || ""}
                    className={errors.confirmPassword ? "input-error" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="error-message">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  className="w-full"
                  loading={submitting}
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordResetPassword;
