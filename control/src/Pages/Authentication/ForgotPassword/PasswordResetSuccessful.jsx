import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../Components/Button/Button";
import Logo from "../../../assets/NoosphereLogo-white.png";
import "../SuperAdmin.css";

const PasswordResetSuccess = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/");
  };

  return (
    <div className="auth-background">
      <img src={Logo} alt="Noosphere Logo" className="Auth-logo" />
      <div className="auth-form-container">
        <div className="icon success-icon">✔</div>
        <h2>Password reset successful!</h2>
        <p className="confirmation-message">You can now login to your account</p>
        <Button
          label="Login"
          variant="primary"
          className="auth-button"
          onClick={handleLogin}
        />
      </div>
    </div>
  );
};

export default PasswordResetSuccess;