import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { PasswordInput } from "../../Components/Input/Inputs";
import Button from "../../Components/Button/Button";
import Logo from "../../assets/NoosphereLogo-white.png";
import { useNavigate } from "react-router-dom";
import "./SuperAdmin.css";
import api from "../../api/authApis";
import { useSelector } from "react-redux";
import { showToast } from "../../Helper/ShowToast";

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

const SuperAdminChangePassword = () => {
  const userId = useSelector((state) => state.authentication?.user?.id);
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
      navigate("/SA/2fa-settings");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to update password.";
      showToast(message, "error");
      if (import.meta.env.DEV) console.error("Could not set password:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Change your password</h2>
        <p className="subtitle">
          Before proceeding you need to set a new password
        </p>
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
            loading={loading}
          />
        </form>
      </div>
    </div>
  );
};

export default SuperAdminChangePassword;