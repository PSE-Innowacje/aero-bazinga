import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Placeholder page for sections not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-heading font-semibold text-text">{title}</h1>
      <p className="mt-md text-body text-text-muted">
        Ta sekcja zostanie zaimplementowana w kolejnych fazach.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require authentication */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Unauthorized page — inside app shell */}
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <AppShell>
                  <UnauthorizedPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Admin section — requires administracja permission */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute section="administracja">
                <AppShell>
                  <PlaceholderPage title="Administracja" />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Operations section — requires planowanie_operacji permission */}
          <Route
            path="/operations/*"
            element={
              <ProtectedRoute section="planowanie_operacji">
                <AppShell>
                  <PlaceholderPage title="Planowanie operacji" />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Flight orders section — requires zlecenia_na_lot permission */}
          <Route
            path="/flight-orders/*"
            element={
              <ProtectedRoute section="zlecenia_na_lot">
                <AppShell>
                  <PlaceholderPage title="Zlecenia na lot" />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
