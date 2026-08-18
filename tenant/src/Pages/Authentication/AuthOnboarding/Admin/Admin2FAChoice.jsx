import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import TenantLogo from "../../../../assets/Logo.svg";
import { RadioInput } from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import "../../Auth.css";

import { showValidationErrors } from "../../../../Helper/formErrors";
// Admin self-choice 2FA screen. Shown when the organisation has NOT set 2FA
// for all (setForAll = false), so each admin picks their own method. Unlike the
// super-admin screen, there is no "enable for all" toggle. Completing the setup
// page sets the admin's own authType + auth2FADone (no global write needed).
const schema = yup.object().shape({
  default2FAMethod: yup
    .string()
    .required("Please select a 2FA method")
    .oneOf(["qrCode", "securityQuestion"], "Invalid 2FA method"),
});

const Admin2FAChoice = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: { default2FAMethod: "qrCode" },
  });

  const onSubmit = (data) => {
    switch (data.default2FAMethod) {
      case "qrCode":
        navigate("/auth/2fa/authenticator");
        break;
      case "securityQuestion":
        navigate("/auth/2fa/security-question");
        break;
      default:
        break;
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
              <h1>
                <span className="hero-line">The all-in-one ABA</span>
                <span className="hero-line">Practice Management</span>
                <span className="hero-line">Solution</span>
              </h1>
            </div>
            <div className="login-section">
              <h2>Set up Two-Factor Authentication (2FA)</h2>
              <p className="subtitle">
                To protect your account, please choose how you'd like to secure
                your sign-in.
              </p>
              <form
                onSubmit={handleSubmit(onSubmit, showValidationErrors)}
                className="auth-form-container"
              >
                <div className="settings-group">
                  <div className="settings-item">
                    <label className="settings-label">
                      Please choose a 2FA method
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
                              Scan a QR code to set up this method, then use a
                              generated time-based code for secure login.
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
                              Select a security question and provide an answer
                              that only you can know.
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
                    <p className="auth-error-message">
                      {errors.default2FAMethod.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  label="Continue"
                  variant="primary"
                  className="w-full mt-4 rounded-full"
                  loading={false}
                />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin2FAChoice;
