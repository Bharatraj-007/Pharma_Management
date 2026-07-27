import { Navigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";

function ProtectedRoute({ permission, children }) {
  const { hasAccess } = usePermissions();

  if (!hasAccess(permission)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

export default ProtectedRoute;
