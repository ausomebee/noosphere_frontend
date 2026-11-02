import { useNavigate } from "react-router-dom";

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
    <div className="text-center mt-6">
      <a
        href={import.meta.env.BASE_URL}
        onClick={handleClick}
        className="text-blue-600 text-sm font-semibold hover:underline inline-flex items-center gap-2"
      >
        ← Back to Login
      </a>
    </div>
  );
};

export default BackToLogin;
