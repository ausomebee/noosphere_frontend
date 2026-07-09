import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Button from "../../../Components/Button/Button";
import { PasswordInput } from "../../../Components/Input/Inputs";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../SuperAdmin.css";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../Helper/passwordValidation";

// Yup validation schema for setting new password. This form renders the strength
// checklist, so it must enforce every rule that checklist displays — previously
// it only required 8 characters, letting through passwords the checklist marked
// as failing. Confirm is held to the same rules.
const setPasswordSchema = yup.object().shape({
  password: passwordSchema(),
  confirmPassword: confirmPasswordSchema("password"),
});

const SetNewPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Extract reset token from URL query parameters
  const query = new URLSearchParams(location.search);
  const token = query.get("token");

  // Form setup with react-hook-form and yup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(setPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async () => {
    navigate("/SA/2fa-question/login");
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <h2>Set a new password</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="input-group">
            <PasswordInput
              required
              label="Password"
              id="password"
              placeholder="Enter password"
              showStrength
              {...register("password")}
              className={`input-text ${errors.password ? "input-error" : ""}`}
            />
            {errors.password && (
              <p className="error-message">{errors.password.message}</p>
            )}
          </div>
          <div className="input-group">
            <PasswordInput
              required
              label="Confirm password"
              id="confirmPassword"
              placeholder="Enter password"
              {...register("confirmPassword")}
              matchValue={watch("password") || ""}
              className={`input-text ${errors.confirmPassword ? "input-error" : ""}`}
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

export default SetNewPassword;