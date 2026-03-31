import React from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_DISPLAY_PL } from "shared/roles";
import { Badge } from "@/components/ui/badge";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div>
      <h1 className="mb-md text-heading font-semibold text-text">
        Witaj, {user.firstName} {user.lastName}
      </h1>
      <Badge variant="secondary">{ROLE_DISPLAY_PL[user.role]}</Badge>
      <p className="mt-lg text-body text-text-muted">
        Wybierz sekcję z menu po lewej stronie, aby rozpocząć pracę.
      </p>
    </div>
  );
}
