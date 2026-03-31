import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { FLIGHT_ORDER_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";

interface FlightOrderListItem {
  id: number;
  order_number: string;
  planned_start_datetime: string;
  planned_end_datetime: string;
  pilot_name: string;
  helicopter_registration: string;
  helicopter_type: string;
  status: number;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pl-PL");
}

function StatusBadge({ status }: { status: number }) {
  const label =
    FLIGHT_ORDER_STATUS_LABELS_PL[
      status as keyof typeof FLIGHT_ORDER_STATUS_LABELS_PL
    ] ?? String(status);

  const colorMap: Record<number, string> = {
    1: "bg-blue-100 text-blue-800",
    2: "bg-yellow-100 text-yellow-800",
    3: "bg-red-100 text-red-800",
    4: "bg-green-100 text-green-800",
    5: "bg-orange-100 text-orange-800",
    6: "bg-gray-100 text-gray-800",
    7: "bg-slate-100 text-slate-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorMap[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {label}
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: "all", label: "Wszystkie" },
  { value: "1", label: "Wprowadzone" },
  { value: "2", label: "Przekazane do akceptacji" },
  { value: "3", label: "Odrzucone" },
  { value: "4", label: "Zaakceptowane" },
  { value: "5", label: "Zrealizowane w części" },
  { value: "6", label: "Zrealizowane w całości" },
  { value: "7", label: "Nie zrealizowane" },
];

export function FlightOrdersListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Default filter: status 2 (Przekazane do akceptacji) per FLT-10
  const [statusFilter, setStatusFilter] = useState<string>("2");
  const [orders, setOrders] = useState<FlightOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate = user?.role === UserRole.PILOT || user?.role === UserRole.SUPERADMIN;

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const url =
      statusFilter && statusFilter !== "all"
        ? `/api/flight-orders?status=${statusFilter}`
        : "/api/flight-orders";

    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać listy zleceń.");
        return res.json();
      })
      .then((data) => {
        setOrders(data.orders ?? []);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [statusFilter]);

  return (
    <div>
      <div className="mb-xl flex items-center justify-between">
        <h1 className="text-heading font-semibold text-primary">
          Zlecenia na lot
        </h1>
        {canCreate && (
          <Button
            onClick={() => navigate("/flight-orders/new")}
            className="bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="mr-sm h-4 w-4" />
            Nowe zlecenie
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="mb-lg flex items-center gap-md">
        <span className="text-body text-text-muted">Filtruj po statusie:</span>
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val)}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <p className="text-body text-text-muted">Ładowanie...</p>
      )}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <p className="text-body text-text-muted">
          Brak zleceń dla wybranego filtra.
        </p>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numer zlecenia</TableHead>
                <TableHead>Planowane rozpoczęcie</TableHead>
                <TableHead>Helikopter</TableHead>
                <TableHead>Pilot</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((fo) => (
                <TableRow
                  key={fo.id}
                  className="cursor-pointer hover:bg-surface"
                  onClick={() => navigate(`/flight-orders/${fo.id}`)}
                >
                  <TableCell className="font-medium text-primary">
                    {fo.order_number}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(fo.planned_start_datetime)}
                  </TableCell>
                  <TableCell>
                    {fo.helicopter_registration}
                  </TableCell>
                  <TableCell>{fo.pilot_name}</TableCell>
                  <TableCell>
                    <StatusBadge status={fo.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
