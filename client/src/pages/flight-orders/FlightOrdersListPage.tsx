import React, { useEffect, useState, useMemo } from "react";
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
import { ListSkeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/context/AuthContext";
import { FLIGHT_ORDER_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";
import { StatusBadge } from "@/components/ui/status-badge";

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
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(fo =>
      fo.order_number?.toLowerCase().includes(q) ||
      fo.pilot_name?.toLowerCase().includes(q) ||
      fo.helicopter_registration?.toLowerCase().includes(q)
    );
  }, [orders, search]);

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

      <div className="mb-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Szukaj po numerze, pilocie lub helikopterze..." />
      </div>

      {isLoading && <ListSkeleton />}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && filteredOrders.length === 0 && (
        <p className="text-body text-text-muted">
          Brak zleceń dla wybranego filtra.
        </p>
      )}

      {!isLoading && !error && filteredOrders.length > 0 && (
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
              {filteredOrders.map((fo) => (
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
                    <StatusBadge status={fo.status} label={FLIGHT_ORDER_STATUS_LABELS_PL[fo.status as keyof typeof FLIGHT_ORDER_STATUS_LABELS_PL] ?? String(fo.status)} type="flight-order" />
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
