import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.authentication);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
