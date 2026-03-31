import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

function NotFoundContent() {
  return (
    <div className="flex flex-col items-center justify-center py-3xl text-center">
      <span className="mb-sm text-display font-semibold text-accent">404</span>
      <h1 className="mb-sm text-heading font-semibold text-text">
        Strona nie istnieje
      </h1>
      <p className="mb-lg text-body text-text-muted">
        Żądana strona nie została znaleziona.
      </p>
      <Link
        to="/"
        className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
      >
        Wróć do strony głównej
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <AppShell>
        <NotFoundContent />
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-md">
      <NotFoundContent />
    </div>
  );
}
