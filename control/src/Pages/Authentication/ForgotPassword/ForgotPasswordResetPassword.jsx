import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import { useNavigate, useParams } from "react-router-dom";
import "./../SuperAdmin.css";
import api from "../../../api/authApis";
import { showToast } from "../../../Helper/ShowToast";

// Yup schema
const schema = yup.object().shape({
  newPassword: yup
    .string()
    .required("New password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      "Password must contain upper/lowercase, number, and special character"
    ),
  confirmPassword: yup
    .string()
    .required("Confirm password is required")
    .oneOf([yup.ref("newPassword"), null], "Passwords must match"),
});

const ForgotPasswordResetPassword = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const handleGetSuperAdminChoice = async () => {
    try {
      const response = await api.GetSuperAdminChoices();
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

      showToast(response?.data?.message || "Password updated successfully!", "success");

      const { setForAll } = await handleGetSuperAdminChoice();
      const { authType, auth2FADone } = response.data.data; // Use setPassword response

      if (setForAll && !auth2FADone) {
        if (authType === "AUTHENTICATOR") {
          navigate("/2fa/authenticator");
        } else if (authType === "SECRETMESSAGE") {
          navigate("/2fa/security-question");
        } else {
          console.error("Unknown authType:", authType);
          showToast("Unknown authentication type", "error");
        }
      } else if (!setForAll && !auth2FADone) {
        navigate("/");
      } else if (setForAll && auth2FADone) {
        if (authType === "AUTHENTICATOR") {
          navigate("/SA/2fa-authentication/login");
        } else if (authType === "SECRETMESSAGE") {
          navigate("/SA/2fa-question/login");
        } else {
          console.error("Unknown authType:", authType);
          showToast("Unknown authentication type", "error");
        }
      }

    } catch (error) {
      console.error("Password update error:", error);
      const message = error?.response?.data?.message || "Failed to update password.";
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Set a new Password</h2>
        <p className="subtitle">Please create a new password</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <PasswordInput
              label="Password"
              id="newPassword"
              placeholder="Enter new password"
              autoComplete="new-password"
              {...register("newPassword")}
              className={errors.newPassword ? "input-error" : ""}
            />
            {errors.newPassword && (
              <p className="error-message">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="form-group">
            <PasswordInput
              label="Confirm password"
              id="confirmPassword"
              placeholder="Confirm new password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "input-error" : ""}
            />
            {errors.confirmPassword && (
              <p className="error-message">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            label="Continue"
            variant="primary"
            className="auth-button"
            loading={submitting}
          />
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordResetPassword;