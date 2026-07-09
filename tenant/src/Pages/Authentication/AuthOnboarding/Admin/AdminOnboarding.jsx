import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { TextInput, PasswordInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import TenantLogo from "../../../../assets/Logo.svg";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import useAuth from "../../../../hooks/useAuth";
import { OnboardAdmin } from "../../../../ReduxStore/features/authentication";
import { showToast } from "../../../../Helper/ShowToast";
import {
  passwordSchema,
  confirmPasswordSchema,
} from "../../../../Helper/passwordValidation";
import api from "../../../../api/authApis";
import "../../../Authentication/Auth.css";

// Yup validation schema
// Both password fields share one rule set, so the confirm field is held to the
// identical strength policy — not just "must match".
const schema = yup.object().shape({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: passwordSchema(),
  confirmPassword: confirmPasswordSchema("password"),
});

const AdminOnboarding = () => {
  const { userId, email } = useParams(); // Extract userId and email from route params
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: decodeURIComponent(email || "") }, // Set email from params
  });

  // Update email field if params change
  React.useEffect(() => {
    if (email) {
      setValue("email", decodeURIComponent(email), { shouldValidate: true });
    }
  }, [email, setValue]);

  const handleGetSuperAdminChoice = async (id) => {
    try {
      const response = await api.GetSuperAdminChoices({id});
  
      const { setForAll, Authenticator2FA, securityQuestion  } = response.data.data;
      return { setForAll, Authenticator2FA, securityQuestion  };
    } catch (error) {
      console.error("Error fetching SuperAdmin choices:", error);
      return { setForAll: false, Authenticator2FA: false, securityQuestion: false };
    }
  };

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(
        OnboardAdmin({ id: userId, password: data.password })
      );

      if (OnboardAdmin.fulfilled.match(resultAction)) {
        const user = resultAction.payload.data;
        showToast("Onboarding successful", "success");

        const { setForAll, Authenticator2FA, securityQuestion  } = await handleGetSuperAdminChoice(user.tenantId);
        const authType = Authenticator2FA
        ? "AUTHENTICATOR"
        : securityQuestion
        ? "SECRETMESSAGE"
        : null;

        if (setForAll && !user.auth2FADone ) {
          if (authType === "AUTHENTICATOR") {
            navigate("/auth/2fa/authenticator");
          } else if (authType === "SECRETMESSAGE") {
            navigate("/auth/2fa/security-question");
          } else {
            console.error("Unknown authType:", authType);
            showToast("Unknown authentication type", "error");
          }
        } else if ((setForAll || !setForAll) && user.auth2FADone) {
          navigate("/");
        } else if (!setForAll && !user.auth2FADone) {
          navigate("/");
        }
      } else {
        const errorMessage = resultAction.payload?.message || "Onboarding failed";
        showToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    }
  };

  const handleLogin = () => {
    navigate("/");
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
              <h2>Welcome</h2>
              <p className="subtitle">
                Please create your NooSphere password to continue
              </p>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group">
                  <TextInput
                    required
                    label="Email"
                    id="email"
                    type="email"
                    placeholder="olivia@therapyco.com"
                    readOnly
                    {...register("email")}
                    className={`input-text ${errors.email ? "input-error" : ""} readonly-input`}
                  />
                  {errors.email && (
                    <p className="auth-error-message">{errors.email.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <PasswordInput
                    required
                    label="Password"
                    id="password"
                    placeholder="Enter a password"
                    showStrength
                    {...register("password")}
                    className={errors.password ? "input-error" : ""}
                  />
                  {errors.password && (
                    <p className="auth-error-message">{errors.password.message}</p>
                  )}
                </div>
                <div className="form-group">
                  <PasswordInput
                    required
                    label="Confirm password"
                    id="confirmPassword"
                    placeholder="Enter a password"
                    {...register("confirmPassword")}
                    matchValue={watch("password") || ""}
                    className={`input-text ${
                      errors.confirmPassword ? "input-error" : ""
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="auth-error-message">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  loading={loading}
                  className="w-full"
                />
                <p className="auth-subtitles">
                  Already have an account?
                  <a href="#" className="cant-accesss" onClick={handleLogin}>
                    Login
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOnboarding;