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
import type { PlannedOperation } from "shared/types";
import { OPERATION_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return dateStr.substring(0, 10);
}

function StatusBadge({ status }: { status: number }) {
  const label = OPERATION_STATUS_LABELS_PL[status as keyof typeof OPERATION_STATUS_LABELS_PL] ?? String(status);

  const colorMap: Record<number, string> = {
    1: "bg-blue-100 text-blue-800",
    2: "bg-red-100 text-red-800",
    3: "bg-green-100 text-green-800",
    4: "bg-orange-100 text-orange-800",
    5: "bg-yellow-100 text-yellow-800",
    6: "bg-gray-100 text-gray-800",
    7: "bg-slate-100 text-slate-800",
  };

  const colorClass = colorMap[status] ?? "bg-gray-100 text-gray-800";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "Wszystkie" },
  { value: "1", label: "Wprowadzone" },
  { value: "2", label: "Odrzucone" },
  { value: "3", label: "Potwierdzone do planu" },
  { value: "4", label: "Zaplanowane do zlecenia" },
  { value: "5", label: "Częściowo zrealizowane" },
  { value: "6", label: "Zrealizowane" },
  { value: "7", label: "Rezygnacja" },
];

export function OperationsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Default filter: status 3 (Potwierdzone do planu) per OPS-12
  const [statusFilter, setStatusFilter] = useState<string>("3");
  const [operations, setOperations] = useState<PlannedOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    user?.role === UserRole.PLANNER || user?.role === UserRole.SUPERVISOR;

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const url = statusFilter
      ? `/api/operations?status=${statusFilter}`
      : "/api/operations";

    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać listy operacji.");
        return res.json();
      })
      .then((data) => {
        setOperations(data.operations ?? []);
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
          Planowane operacje
        </h1>
        {canCreate && (
          <Button
            onClick={() => navigate("/operations/new")}
            className="bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="mr-sm h-4 w-4" />
            Nowa operacja
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
          <SelectTrigger className="w-[220px]">
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

      {!isLoading && !error && operations.length === 0 && (
        <p className="text-body text-text-muted">
          Brak operacji dla wybranego filtra.
        </p>
      )}

      {!isLoading && !error && operations.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numer operacji</TableHead>
                <TableHead>Nr projektu</TableHead>
                <TableHead>Typy operacji</TableHead>
                <TableHead>Prop. data najwcz.</TableHead>
                <TableHead>Prop. data najpóźn.</TableHead>
                <TableHead>Plan. data najwcz.</TableHead>
                <TableHead>Plan. data najpóźn.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.map((op) => (
                <TableRow
                  key={op.id}
                  className="cursor-pointer hover:bg-surface"
                  onClick={() => navigate(`/operations/${op.id}`)}
                >
                  <TableCell className="font-medium text-primary">
                    {op.operation_number}
                  </TableCell>
                  <TableCell>{op.project_reference}</TableCell>
                  <TableCell>
                    {Array.isArray(op.operation_types)
                      ? op.operation_types.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>{formatDate(op.proposed_earliest_date)}</TableCell>
                  <TableCell>{formatDate(op.proposed_latest_date)}</TableCell>
                  <TableCell>{formatDate(op.planned_earliest_date)}</TableCell>
                  <TableCell>{formatDate(op.planned_latest_date)}</TableCell>
                  <TableCell>
                    <StatusBadge status={op.status} />
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
