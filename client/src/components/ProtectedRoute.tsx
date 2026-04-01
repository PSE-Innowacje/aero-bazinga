import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import type { MenuSection } from "shared/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  section?: MenuSection;
  minPermission?: PermissionLevel;
}

export function ProtectedRoute({
  children,
  section,
  minPermission = PermissionLevel.READ,
}: ProtectedRouteProps) {
  const { user, permissions, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (section && user && permissions) {
    const level = permissions[section];
    if (!level || level === PermissionLevel.NONE) {
      return <Navigate to="/unauthorized" replace />;
    }
    if (
      minPermission === PermissionLevel.CRUD &&
      level === PermissionLevel.READ
    ) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
