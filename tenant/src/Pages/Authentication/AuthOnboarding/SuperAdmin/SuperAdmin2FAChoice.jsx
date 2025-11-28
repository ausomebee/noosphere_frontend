import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import TenantLogo from "../../../../assets/Logo.svg";
import { SwitchInput, RadioInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import "../../Auth.css";
import api from "../../../../api/authApis";
import { showToast } from "../../../../Helper/ShowToast";
import { useSelector } from "react-redux";
// Yup validation schema
const schema = yup.object().shape({
  enable2FA: yup.boolean().required(),
  default2FAMethod: yup
    .string()
    .required("Please select a default 2FA method")
    .oneOf(["qrCode", "securityQuestion"], "Invalid 2FA method"),
});

const SuperAdmin2FAChoice = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      enable2FA: true,
      default2FAMethod: "qrCode",
    },
  });
  const userId = useSelector((state) => state.authentication?.user?.tenantId);

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const Authenticator2FA = data.default2FAMethod === "qrCode";
      const securityQuestion = data.default2FAMethod === "securityQuestion";
      const setForAll = data.enable2FA;

      const response = await api.SuperAdminChoices({
        Authenticator2FA,
        securityQuestion,
        setForAll,
        tenantId: userId
      });

      const successMessage =
        response?.data?.message || "2FA settings saved successfully!";
      showToast(successMessage, "success");

      switch (data.default2FAMethod) {
        case "qrCode":
          navigate("/auth/2fa/authenticator");
          break;
        case "securityQuestion":
          navigate("/auth/2fa/security-question");
          break;
        default:
          console.error("Invalid 2FA method selected");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to update 2FA settings.";
      showToast(message, "error");
      console.error("2FA settings error:", error);
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
              <h1>The all-in-one ABA Practice Management Solution</h1>
            </div>
            <div className="login-section">
              <h2>Two-Factor Authentication (2FA) Settings</h2>
              <p className="subtitle">
                To protect your organization and client data, two-factor
                authentication (2FA) is recommended. Please set the 2FA
                preferences for your organization below.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="auth-form-container">
                <div className="settings-group">
                  <div className="settings-item">
                    <label className="settings-label">
                      Enable two-factor authentication for all users
                    </label>
                    <SwitchInput
                      {...register("enable2FA")}
                      inputPosition="after"
                    />
                  </div>
                  <div className="settings-item">
                    <label className="settings-label">
                      Please choose a default 2FA method for all users
                      <h3 className="settings-note">
                        You can change this later in settings
                      </h3>
                    </label>
                  </div>
                  <div className="radio-group">
                    <div className="radio-option">
                      <RadioInput
                        label={
                          <>
                            <span className="radio-title">
                              Authenticator app{" "}
                              <span className="recommended">Recommended</span>
                            </span>
                            <span className="radio-description">
                              Users will scan a QR code to set up this method,
                              and use a generated time-based code for secure
                              login.
                            </span>
                          </>
                        }
                        name="default2FAMethod"
                        value="qrCode"
                        inputPosition=""
                        {...register("default2FAMethod")}
                      />
                    </div>
                    <div className="radio-option">
                      <RadioInput
                        label={
                          <>
                            <span className="radio-title">Security Question</span>
                            <span className="radio-description">
                              Users will select a security question and provide
                              an answer that only they can know.
                            </span>
                          </>
                        }
                        name="default2FAMethod"
                        value="securityQuestion"
                        inputPosition=""
                        {...register("default2FAMethod")}
                      />
                    </div>
                  </div>
                  {errors.default2FAMethod && (
                    <p className="auth-error-message">{errors.default2FAMethod.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  className="w-full mt-4 rounded-full"
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

export default SuperAdmin2FAChoice;