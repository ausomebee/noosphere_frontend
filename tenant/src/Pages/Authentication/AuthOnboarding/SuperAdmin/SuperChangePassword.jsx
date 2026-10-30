import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../../hooks/useAuth";
import { showToast } from "../../../../Helper/ShowToast";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../../Helper/passwordValidation";
import api from "../../../../api/authApis";
import "../../Auth.css";
import TenantLogo from "../../../../assets/Logo.svg";
import { PasswordInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";

import { showValidationErrors } from "../../../../Helper/formErrors";
// Validation schema. Confirm is held to the same strength rules as the new password.
const schema = yup.object().shape({
  newPassword: passwordSchema("New password"),
  confirmPassword: confirmPasswordSchema("newPassword"),
});

const SuperChangePassword = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.AdminSetPassword({
        id: userId,
        password: data.newPassword,
      });

      const successMessage = response?.data?.message || "Password updated successfully!";
      showToast(successMessage, "success");
      navigate("/auth/2fa-settings");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to update password.";
      showToast(message, "error");
      console.error("Could not set password:", error);
    } finally {
      setLoading(false);
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
              <h2>Change your password</h2>
              <p>Before proceeding, you need to set a new password</p>
              <form onSubmit={handleSubmit(onSubmit, showValidationErrors)}>
                <PasswordInput
                  required
                  label="Password"
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  showStrength
                  {...register("newPassword")}
                  error={errors.newPassword?.message}
                />
                <PasswordInput
                  required
                  label="Confirm Password"
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  matchValue={watch("newPassword") || ""}
                  error={errors.confirmPassword?.message}
                />
                <Button
                  label="Continue"
                  variant="primary"
                  size="large"
                  className="w-full mt-4 rounded-full"
                  type="submit"
                  loading={loading}
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperChangePassword;