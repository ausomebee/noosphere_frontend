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
    resolver: yupResolver(schema),
  });
  const { loading } = useAuth();

  const handleGetSuperAdminChoice = async (id) => {
    try {
      const response = await api.GetSuperAdminChoices({ id });
      const { setForAll, Authenticator2FA, securityQuestion } =
        response.data.data;
      return { setForAll, Authenticator2FA, securityQuestion };
    } catch (error) {
      console.error("Error fetching SuperAdmin choices:", error);
      return {
        setForAll: false,
        Authenticator2FA: false,
        securityQuestion: false,
      };
    }
  };

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(AdminLogin(data));

      if (AdminLogin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Login successful", "success");

        if (user.role.name === "Admin") {
          if (!user.auth2FADone) {
            navigate("/auth/change-password");
          } else {
            if (user.authType === "AUTHENTICATOR") {
              navigate("/auth/2fa/login-authenticator");
            } else if (user.authType === "SECRETMESSAGE") {
              navigate("/auth/2fa/login-question");
            } else {
              showToast("Unknown authentication type", "error");
            }
          }
        } else {
          // Non-admin users: Check super admin choices
          const { setForAll, Authenticator2FA, securityQuestion } =
            await handleGetSuperAdminChoice(user.tenantId);

          if (setForAll && !user.auth2FADone) {
            const authType = Authenticator2FA
              ? "AUTHENTICATOR"
              : securityQuestion
              ? "SECRETMESSAGE"
              : null;

            if (authType === "AUTHENTICATOR") {
              navigate("/auth/2fa/authenticator");
            } else if (authType === "SECRETMESSAGE") {
              navigate("/auth/2fa/security-question");
            } else {
              showToast("Unknown authentication type", "error");
            }
          } else if (!setForAll && !user.auth2FADone) {
            connectSocket({ accessToken: user.accessToken, userId: user.id, tenantId: user.tenantId });
            navigate("/dashboard");
          } else {
            if (user.authType === "AUTHENTICATOR") {
              navigate("/auth/2fa/login-authenticator");
            } else if (user.authType === "SECRETMESSAGE") {
              navigate("/auth/2fa/login-question");
            } else {
              showToast("Unknown authentication type", "error");
            }
          }
        }
      } else {
        const errorMessage = resultAction.payload?.message || "Login failed";
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
                <h1>The all-in-one ABA<br />Practice Management<br />Solution</h1>
              </div>
            </div>
            <div className="login-wrapper">
              <div className="login-section">
                <h2>Welcome Back</h2>
                <p>Please login to your account</p>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-24">
                  <TextInput
                    label="Email"
                    placeholder="Enter your mail"
                    className="p-4"
                    {...register("email")}
                    error={errors.email?.message}
                  />
                  </div>
                  <PasswordInput
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
