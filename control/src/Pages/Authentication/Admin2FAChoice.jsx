import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import Button from "../../Components/Button/Button";
import Logo from "../../assets/NoosphereLogo-white.png";
import { RadioInput } from "../../Components/Input/Inputs";
import "./MicrosoftAuth/SuperAdmin2FAMicrosoftAuthenticator.css";
import "./SuperAdmin.css";

// Admin self-choice 2FA screen — shown when the org has NOT set 2FA for all
// (setForAll = false) and the admin has no method yet. No "set for all" option;
// completing the setup page sets the admin's own authType + auth2FADone.
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
    resolver: yupResolver(schema),
    defaultValues: { default2FAMethod: "qrCode" },
  });

  const onSubmit = (data) => {
    if (data.default2FAMethod === "qrCode") {
      navigate("/2fa/authenticator");
    } else if (data.default2FAMethod === "securityQuestion") {
      navigate("/2fa/security-question");
    }
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth2fas-form-container">
        <h2>Set up Two-Factor Authentication (2FA)</h2>
        <p className="subtitle">
          To protect your account, please choose how you'd like to secure your
          sign-in.
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="radio-group">
            <div className="radio-option">
              <RadioInput
                label="Authenticator app (Recommended) — scan a QR code, then use a generated time-based code to log in."
                name="default2FAMethod"
                value="qrCode"
                {...register("default2FAMethod")}
              />
            </div>
            <div className="radio-option">
              <RadioInput
                label="Security Question — select a question and provide an answer only you know."
                name="default2FAMethod"
                value="securityQuestion"
                {...register("default2FAMethod")}
              />
            </div>
          </div>
          {errors.default2FAMethod && (
            <p className="error-message">{errors.default2FAMethod.message}</p>
          )}
          <Button
            type="submit"
            label="Continue"
            variant="primary"
            className="auth-button"
          />
        </form>
      </div>
    </div>
  );
};

export default Admin2FAChoice;
