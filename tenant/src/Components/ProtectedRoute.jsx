import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useAuth from "../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const pending2FA = useSelector((s) => s.authentication?.pending2FA);
  const pending2FARoute = useSelector((s) => s.authentication?.pending2FARoute);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  // Signed in with a password but 2FA not finished yet: the tokens are real,
  // so without this a typed URL would skip the second factor.
  if (pending2FA) return <Navigate to={pending2FARoute || "/"} replace />;
  return children;
};

export default ProtectedRoute;
