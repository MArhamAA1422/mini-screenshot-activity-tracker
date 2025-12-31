import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireEmployee?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin,
  requireEmployee,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isEmployee, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  if (requireEmployee && !isEmployee) {
    return <Navigate to="/admin/employees" replace />;
  }

  return <>{children}</>;
}
