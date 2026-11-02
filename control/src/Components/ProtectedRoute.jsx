import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, pending2FA, pending2FARoute } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  // Password accepted but 2FA not finished: send them back to their 2FA step.
  if (pending2FA) return <Navigate to={pending2FARoute || "/"} replace />;
  return children;
};

export default ProtectedRoute;
