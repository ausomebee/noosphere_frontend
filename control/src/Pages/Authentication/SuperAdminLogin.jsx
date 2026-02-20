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
      const { setForAll, Authenticator2FA, securityQuestion } = response.data.data;
      return { setForAll, Authenticator2FA, securityQuestion };
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching SuperAdmin choices:", error);
      return { setForAll: false, Authenticator2FA: false, securityQuestion: false };
    }
  };

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(AdminLogin(data));

      if (AdminLogin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Login successful", "success");

        if (user.superAdmin) {
          if (!user.auth2FADone) {
            navigate("/SA/change-password");
          } else {
            if (user.authType === "AUTHENTICATOR") {
              navigate("/SA/2fa-authentication/login");
            } else if (user.authType === "SECRETMESSAGE") {
              navigate("/SA/2fa-question/login");
            } else {
              if (import.meta.env.DEV) console.error("Unknown authType:", user.authType);
              showToast("Unknown authentication type", "error");
            }
          }
        } else {
          const { setForAll, Authenticator2FA, securityQuestion } = await handleGetSuperAdminChoice();

          if (setForAll && !user.auth2FADone) {
            const authType = Authenticator2FA
              ? "AUTHENTICATOR"
              : securityQuestion
              ? "SECRETMESSAGE"
              : null;

            if (authType === "AUTHENTICATOR") {
              navigate("/2fa/authenticator");
            } else if (authType === "SECRETMESSAGE") {
              navigate("/2fa/security-question");
            } else {
              if (import.meta.env.DEV) console.error("Unknown authType:", authType);
              showToast("Unknown authentication type", "error");
            }
          } else if (!setForAll && !user.auth2FADone) {
            navigate("/tenants/pipeline");
          } else {
            if (user.authType === "AUTHENTICATOR") {
              navigate("/SA/2fa-authentication/login");
            } else if (user.authType === "SECRETMESSAGE") {
              navigate("/SA/2fa-question/login");
            } else {
              if (import.meta.env.DEV) console.error("Unknown authType:", user.authType);
              showToast("Unknown authentication type", "error");
            }
          }
        }
      } else {
        const errorMessage = resultAction.payload?.message || "Login failed";
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