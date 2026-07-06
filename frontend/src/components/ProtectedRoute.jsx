import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, dashboardPath } from "@/context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-zinc-500 tracking-widest uppercase">Loading…</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }
  return children;
}
