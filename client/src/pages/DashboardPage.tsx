import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Plane,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_DISPLAY_PL } from "shared/roles";
import { UserRole } from "shared/roles";
import { OPERATION_STATUS_LABELS_PL } from "shared/statuses";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  stats: {
    operations: {
      ops_new: string;
      ops_confirmed: string;
      ops_scheduled: string;
      ops_completed: string;
      ops_total: string;
    };
    flightOrders: {
      fo_draft: string;
      fo_submitted: string;
      fo_accepted: string;
      fo_completed: string;
      fo_total: string;
    };
    helicopters: {
      active: string;
      total: string;
    };
  };
  myOperations?: {
    new: string;
    confirmed: string;
    cancelled: string;
    total: string;
  };
  myFlightOrders?: {
    draft: string;
    submitted: string;
    accepted: string;
    total: string;
  };
  pendingOperations?: Array<{
    id: number;
    operation_number: string;
    short_description: string;
    created_at: string;
  }>;
  pendingFlightOrders?: Array<{
    id: number;
    order_number: string;
    planned_start_datetime: string;
    pilot_name: string;
  }>;
  readyFlightOrders?: Array<{
    id: number;
    order_number: string;
    planned_start_datetime: string;
    helicopter: string;
  }>;
  usersByRole?: Array<{ role: string; count: string }>;
  expiring?: {
    helicopters: Array<{
      id: number;
      registration_number: string;
      inspection_expiry_date: string;
    }>;
    licenses: Array<{
      id: number;
      first_name: string;
      last_name: string;
      license_expiry_date: string;
    }>;
    training: Array<{
      id: number;
      first_name: string;
      last_name: string;
      training_expiry_date: string;
    }>;
  };
  recentActivity?: Array<{
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    user_email: string;
    ref_number: string;
    ref_type: string;
    ref_id: number;
  }>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  onClick,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  onClick?: () => void;
  accent?: "primary" | "warning" | "muted";
}) {
  const iconColors = {
    primary: "bg-[#EBF2FA] text-primary",
    warning: "bg-[#FFF5F5] text-accent",
    muted: "bg-surface text-secondary",
  };
  const iconStyle = iconColors[accent ?? "primary"];

  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <div className="p-md">
        <div className="flex items-start justify-between gap-md">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {title}
            </p>
            <p className="mt-sm text-2xl font-semibold text-text">{value}</p>
            {subtitle && (
              <p className="mt-xs text-xs text-text-muted">{subtitle}</p>
            )}
          </div>
          <div className={`shrink-0 rounded-lg p-sm ${iconStyle}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-xl mb-md text-sm font-semibold uppercase tracking-wide text-primary">
      {children}
    </h2>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-md py-sm text-left text-xs font-medium uppercase tracking-wide text-text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pl-PL");
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pl-PL");
}

function statusLabel(code: string | null): string {
  if (!code) return "—";
  const num = Number(code);
  return (
    OPERATION_STATUS_LABELS_PL[num as keyof typeof OPERATION_STATUS_LABELS_PL] ??
    code
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = user?.role;
  const isAdmin = role === UserRole.ADMINISTRATOR || role === UserRole.SUPERADMIN;
  const isSupervisor = role === UserRole.SUPERVISOR || role === UserRole.SUPERADMIN;
  const isPilot = role === UserRole.PILOT;
  const isPlanner = role === UserRole.PLANNER;

  useEffect(() => {
    fetch("/api/dashboard", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać danych.");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  if (!user) return null;

  if (isLoading) {
    return <p className="text-body text-text-muted">Ładowanie...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;
  const totalExpiring =
    (data.expiring?.helicopters.length ?? 0) +
    (data.expiring?.licenses.length ?? 0) +
    (data.expiring?.training.length ?? 0);

  return (
    <div className="max-w-6xl">
      {/* ── Welcome ───────────────────────────────────────────── */}
      <div className="mb-lg flex items-center gap-md">
        <div>
          <h1 className="text-heading font-semibold text-text">
            Witaj, {user.firstName} {user.lastName}
          </h1>
        </div>
      </div>

      {/* ── Global stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nowe operacje"
          value={stats.operations.ops_new}
          icon={ClipboardList}
          subtitle={`${stats.operations.ops_total} łącznie`}
          onClick={() => navigate("/operations")}
        />
        <StatCard
          title="Potwierdzone"
          value={stats.operations.ops_confirmed}
          icon={ClipboardList}
          subtitle="Gotowe do zlecenia"
          accent="muted"
        />
        <StatCard
          title="Do akceptacji"
          value={stats.flightOrders.fo_submitted}
          icon={FileText}
          subtitle={`${stats.flightOrders.fo_total} zleceń łącznie`}
          onClick={() => navigate("/flight-orders")}
        />
        <StatCard
          title="Aktywne helikoptery"
          value={stats.helicopters.active}
          icon={Plane}
          subtitle={`${stats.helicopters.total} łącznie`}
          accent="muted"
        />
      </div>

      {/* ── Planner: my operations ────────────────────────────── */}
      {isPlanner && data.myOperations && (
        <>
          <SectionTitle>Moje operacje</SectionTitle>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-4">
            <StatCard title="Oczekujące" value={data.myOperations.new} icon={Clock} />
            <StatCard title="Potwierdzone" value={data.myOperations.confirmed} icon={ClipboardList} accent="muted" />
            <StatCard title="Anulowane" value={data.myOperations.cancelled} icon={AlertTriangle} accent="warning" />
            <StatCard title="Łącznie" value={data.myOperations.total} icon={ClipboardList} accent="muted" />
          </div>
        </>
      )}

      {/* ── Supervisor: pending actions ───────────────────────── */}
      {isSupervisor && (
        <>
          {data.pendingOperations && data.pendingOperations.length > 0 && (
            <>
              <SectionTitle>Operacje wymagające działania</SectionTitle>
              <DataTable headers={["Numer", "Opis", "Data dodania"]}>
                {data.pendingOperations.map((op) => (
                  <tr
                    key={op.id}
                    className="cursor-pointer border-b border-border-subtle hover:bg-surface"
                    onClick={() => navigate(`/operations/${op.id}`)}
                  >
                    <td className="px-md py-sm font-medium text-primary whitespace-nowrap">{op.operation_number}</td>
                    <td className="px-md py-sm text-text">{op.short_description}</td>
                    <td className="px-md py-sm text-text-muted whitespace-nowrap">{formatDate(op.created_at)}</td>
                  </tr>
                ))}
              </DataTable>
            </>
          )}

          {data.pendingFlightOrders && data.pendingFlightOrders.length > 0 && (
            <>
              <SectionTitle>Zlecenia do akceptacji</SectionTitle>
              <DataTable headers={["Numer", "Pilot", "Planowany start"]}>
                {data.pendingFlightOrders.map((fo) => (
                  <tr
                    key={fo.id}
                    className="cursor-pointer border-b border-border-subtle hover:bg-surface"
                    onClick={() => navigate(`/flight-orders/${fo.id}`)}
                  >
                    <td className="px-md py-sm font-medium text-primary whitespace-nowrap">{fo.order_number}</td>
                    <td className="px-md py-sm text-text">{fo.pilot_name}</td>
                    <td className="px-md py-sm text-text-muted whitespace-nowrap">{formatDateTime(fo.planned_start_datetime)}</td>
                  </tr>
                ))}
              </DataTable>
            </>
          )}
        </>
      )}

      {/* ── Pilot: my flight orders ───────────────────────────── */}
      {isPilot && (
        <>
          {data.myFlightOrders && (
            <>
              <SectionTitle>Moje zlecenia na lot</SectionTitle>
              <div className="grid grid-cols-1 gap-md sm:grid-cols-4">
                <StatCard title="Robocze" value={data.myFlightOrders.draft} icon={FileText} accent="muted" />
                <StatCard title="Przekazane" value={data.myFlightOrders.submitted} icon={Clock} />
                <StatCard title="Zaakceptowane" value={data.myFlightOrders.accepted} icon={FileText} accent="muted" />
                <StatCard title="Łącznie" value={data.myFlightOrders.total} icon={FileText} accent="muted" />
              </div>
            </>
          )}

          {data.readyFlightOrders && data.readyFlightOrders.length > 0 && (
            <>
              <SectionTitle>Zlecenia gotowe do realizacji</SectionTitle>
              <DataTable headers={["Numer", "Helikopter", "Planowany start"]}>
                {data.readyFlightOrders.map((fo) => (
                  <tr
                    key={fo.id}
                    className="cursor-pointer border-b border-border-subtle hover:bg-surface"
                    onClick={() => navigate(`/flight-orders/${fo.id}`)}
                  >
                    <td className="px-md py-sm font-medium text-primary whitespace-nowrap">{fo.order_number}</td>
                    <td className="px-md py-sm text-text">{fo.helicopter}</td>
                    <td className="px-md py-sm text-text-muted whitespace-nowrap">{formatDateTime(fo.planned_start_datetime)}</td>
                  </tr>
                ))}
              </DataTable>
            </>
          )}
        </>
      )}

      {/* ── Admin: users & expiring ───────────────────────────── */}
      {isAdmin && (
        <>
          <SectionTitle>Użytkownicy w systemie</SectionTitle>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
            {data.usersByRole?.map((r) => (
              <StatCard
                key={r.role}
                title={ROLE_DISPLAY_PL[r.role as UserRole] ?? r.role}
                value={r.count}
                icon={Users}
                accent="muted"
              />
            ))}
          </div>

          {totalExpiring > 0 && (
            <>
              <SectionTitle>
                <span className="flex items-center gap-sm">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  Wygasające w ciągu 30 dni ({totalExpiring})
                </span>
              </SectionTitle>

              {data.expiring!.helicopters.length > 0 && (
                <div className="mb-md">
                  <p className="mb-sm text-xs font-medium text-text-muted">Przeglądy helikopterów</p>
                  <DataTable headers={["Nr rejestracyjny", "Wygasa"]}>
                    {data.expiring!.helicopters.map((h) => (
                      <tr key={h.id} className="border-b border-border-subtle">
                        <td className="px-md py-sm text-text">{h.registration_number}</td>
                        <td className="px-md py-sm font-medium text-accent">{formatDate(h.inspection_expiry_date)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}

              {data.expiring!.licenses.length > 0 && (
                <div className="mb-md">
                  <p className="mb-sm text-xs font-medium text-text-muted">Licencje pilotów</p>
                  <DataTable headers={["Imię i nazwisko", "Wygasa"]}>
                    {data.expiring!.licenses.map((c) => (
                      <tr key={c.id} className="border-b border-border-subtle">
                        <td className="px-md py-sm text-text">{c.first_name} {c.last_name}</td>
                        <td className="px-md py-sm font-medium text-accent">{formatDate(c.license_expiry_date)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}

              {data.expiring!.training.length > 0 && (
                <div className="mb-md">
                  <p className="mb-sm text-xs font-medium text-text-muted">Szkolenia członków załogi</p>
                  <DataTable headers={["Imię i nazwisko", "Wygasa"]}>
                    {data.expiring!.training.map((c) => (
                      <tr key={c.id} className="border-b border-border-subtle">
                        <td className="px-md py-sm text-text">{c.first_name} {c.last_name}</td>
                        <td className="px-md py-sm font-medium text-accent">{formatDate(c.training_expiry_date)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Recent activity ───────────────────────────────────── */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <>
          <SectionTitle>Ostatnia aktywność</SectionTitle>
          <DataTable headers={["Operacja", "Zmiana statusu", "Użytkownik", "Data"]}>
            {data.recentActivity.map((act, i) => (
              <tr
                key={i}
                className="cursor-pointer border-b border-border-subtle hover:bg-surface"
                onClick={() => navigate(`/operations/${act.ref_id}`)}
              >
                <td className="px-md py-sm font-medium text-primary whitespace-nowrap">{act.ref_number}</td>
                <td className="px-md py-sm text-text">{statusLabel(act.old_value)} → {statusLabel(act.new_value)}</td>
                <td className="px-md py-sm text-text-muted">{act.user_email}</td>
                <td className="px-md py-sm text-text-muted whitespace-nowrap">{formatDateTime(act.changed_at)}</td>
              </tr>
            ))}
          </DataTable>
        </>
      )}
    </div>
  );
}
