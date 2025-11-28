import React from "react";
import AuthImg from "../../assets/Images/AuthImage.png";
import Logo from "../../assets/Logo.svg";
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      <style>{`
       
        .auth-container {
          display: flex;
          min-height: 100vh;
         
        }
        
        .auth-image-section {
          flex: 1;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .auth-image-section img {
          width: 100%;
          height: auto;
          max-height: 95vh;
          object-fit: cover;
          border-radius: 16px;
        }
        
        .auth-form-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 60px;
          
        }
        
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 100px;
        }
        
        .auth-logo-icon {
          width: 350px;
          height: 60px;
        }
    
        
        .auth-form-container {
          width: 100%;
          max-width: 380px;
        }
        
        /* Tablet styles */
        @media (max-width: 1024px) {
          .auth-image-section {
            padding: 20px;
          }
          
          .auth-image-section img {
            max-width: 350px;
          }
          
          .auth-form-section {
            padding: 20px;
            margin-top: 30px;
          }
          
          .auth-logo {
            margin-bottom: 30px;
          }
          
          .auth-form-container {
            max-width: 380px;
          }
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          .auth-container {
            flex-direction: column;
          }
          
          .auth-image-section {
            display: none;
          }

          .auth-logo-icon{
          width: 200px
          }
          
          .auth-form-section {
            flex: 1;
            justify-content: flex-start;
            padding: 40px 24px;
          }
          
          .auth-logo {
            margin-bottom: 40px;
          }
          
          .auth-form-container {
            max-width: 100%;
          }
        }
        
        /* Small mobile */
        @media (max-width: 480px) {
          .auth-form-section {
            padding: 32px 20px;
          }
          
          .auth-logo {
            margin-bottom: 32px;
          }
          
          .auth-logo-text {
            font-size: 22px;
          }
        }
      `}</style>

      {/* Left Side - Image */}
      <div className="auth-image-section">
        <img src={AuthImg} alt="Welcome" />
      </div>

      {/* Right Side - Logo + Form */}
      <div className="auth-form-section">
        <div className="auth-logo">
          <img src={Logo} alt="Logo" className="auth-logo-icon" />
        </div>

        <div className="auth-form-container">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
