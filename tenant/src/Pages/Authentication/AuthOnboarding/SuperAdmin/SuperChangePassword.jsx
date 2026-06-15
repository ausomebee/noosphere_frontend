import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../../hooks/useAuth";
import { showToast } from "../../../../Helper/ShowToast";
import api from "../../../../api/authApis";
import "../../Auth.css";
import TenantLogo from "../../../../assets/Logo.svg";
import { PasswordInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";

// Validation schema
const schema = yup.object().shape({
  newPassword: yup
    .string()
    .required("New password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
      "Password must be strong. At least one upper case letter, one lower case letter, one digit, one special character, and at least 8 characters long."
    ),
  confirmPassword: yup
    .string()
    .required("Confirm password is required")
    .oneOf([yup.ref("newPassword"), null], "Passwords must match"),
});

const SuperChangePassword = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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
              <h1>The all-in-one ABA<br />Practice Management<br />Solution</h1>
            </div>
            <div className="login-section">
              <h2>Change your password</h2>
              <p>Before proceeding, you need to set a new password</p>
              <form onSubmit={handleSubmit(onSubmit)}>
                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  showStrength
                  {...register("newPassword")}
                  error={errors.newPassword?.message}
                />
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
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