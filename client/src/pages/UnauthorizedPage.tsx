import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-3xl text-center">
      <ShieldAlert className="mb-lg h-12 w-12 text-accent" />
      <h1 className="mb-sm text-heading font-semibold text-text">
        Brak dostępu
      </h1>
      <p className="mb-lg text-body text-text-muted">
        Nie masz uprawnień do przeglądania tej sekcji.
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
