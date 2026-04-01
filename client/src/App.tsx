import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { HelicoptersPage } from "@/pages/admin/HelicoptersPage";
import { HelicopterFormPage } from "@/pages/admin/HelicopterFormPage";
import { CrewPage } from "@/pages/admin/CrewPage";
import { CrewMemberFormPage } from "@/pages/admin/CrewMemberFormPage";
import { AirfieldsPage } from "@/pages/admin/AirfieldsPage";
import { AirfieldFormPage } from "@/pages/admin/AirfieldFormPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { UserFormPage } from "@/pages/admin/UserFormPage";
import { OperationsListPage } from "@/pages/operations/OperationsListPage";
import { OperationFormPage } from "@/pages/operations/OperationFormPage";
import { OperationDetailPage } from "@/pages/operations/OperationDetailPage";
import { FlightOrdersListPage } from "@/pages/flight-orders/FlightOrdersListPage";
import { FlightOrderFormPage } from "@/pages/flight-orders/FlightOrderFormPage";
import { FlightOrderDetailPage } from "@/pages/flight-orders/FlightOrderDetailPage";
import { PermissionsPage } from "@/pages/admin/PermissionsPage";

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
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: "Inter, sans-serif", fontSize: "14px" },
          classNames: {
            success: "!bg-[#ECFDF5] !text-[#16A34A] !border-[#16A34A]/20",
            error: "!bg-[#FFF5F5] !text-[#D20A11] !border-[#D20A11]/20",
            info: "!bg-[#EBF2FA] !text-[#003E7E] !border-[#003E7E]/20",
          },
        }}
        richColors
        closeButton
      />
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
                  <Routes>
                    <Route path="helicopters" element={<HelicoptersPage />} />
                    <Route path="helicopters/new" element={<HelicopterFormPage />} />
                    <Route path="helicopters/:id/edit" element={<HelicopterFormPage />} />
                    <Route path="crew" element={<CrewPage />} />
                    <Route path="crew/new" element={<CrewMemberFormPage />} />
                    <Route path="crew/:id/edit" element={<CrewMemberFormPage />} />
                    <Route path="airfields" element={<AirfieldsPage />} />
                    <Route path="airfields/new" element={<AirfieldFormPage />} />
                    <Route path="airfields/:id/edit" element={<AirfieldFormPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="users/new" element={<UserFormPage />} />
                    <Route path="users/:id/edit" element={<UserFormPage />} />
                    <Route path="permissions" element={<PermissionsPage />} />
                    <Route path="*" element={<PlaceholderPage title="Administracja" />} />
                  </Routes>
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
                  <Routes>
                    <Route index element={<OperationsListPage />} />
                    <Route path="new" element={<OperationFormPage />} />
                    <Route path=":id" element={<OperationDetailPage />} />
                    <Route path=":id/edit" element={<OperationFormPage />} />
                  </Routes>
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
                  <Routes>
                    <Route index element={<FlightOrdersListPage />} />
                    <Route path="new" element={<FlightOrderFormPage />} />
                    <Route path=":id" element={<FlightOrderDetailPage />} />
                    <Route path=":id/edit" element={<FlightOrderFormPage />} />
                  </Routes>
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
