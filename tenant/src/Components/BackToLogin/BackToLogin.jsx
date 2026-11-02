import { useNavigate } from "react-router-dom";
import "./BackToLogin.css";

/**
 * "← Back to Login" for the forgot-password pages. Pages that set or change a
 * password don't get one: they finish by sending the user on themselves.
 */
const BackToLogin = () => {
  const navigate = useNavigate();

  const handleClick = (event) => {
    event.preventDefault();
    navigate("/");
  };

  return (
    <p className="back-to-login">
      <a href={import.meta.env.BASE_URL} onClick={handleClick}>
        ← Back to Login
      </a>
    </p>
  );
};

export default BackToLogin;
