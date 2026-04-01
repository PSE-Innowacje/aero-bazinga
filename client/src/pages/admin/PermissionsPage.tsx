import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import { UserRole, ROLE_DISPLAY_PL } from "shared/roles";

type PermissionMatrix = Record<string, Record<string, string>>;

const SECTIONS = [
  { key: "administracja", label: "Administracja" },
  { key: "planowanie_operacji", label: "Planowanie operacji" },
  { key: "zlecenia_na_lot", label: "Zlecenia na lot" },
];

const ROLES = [
  { key: UserRole.SUPERADMIN, label: ROLE_DISPLAY_PL[UserRole.SUPERADMIN] },
  { key: UserRole.ADMINISTRATOR, label: ROLE_DISPLAY_PL[UserRole.ADMINISTRATOR] },
  { key: UserRole.PLANNER, label: ROLE_DISPLAY_PL[UserRole.PLANNER] },
  { key: UserRole.SUPERVISOR, label: ROLE_DISPLAY_PL[UserRole.SUPERVISOR] },
  { key: UserRole.PILOT, label: ROLE_DISPLAY_PL[UserRole.PILOT] },
];

const LEVELS = [
  { value: PermissionLevel.NONE, label: "Brak dostępu" },
  { value: PermissionLevel.READ, label: "Podgląd" },
  { value: PermissionLevel.EDIT_VIEW, label: "Edycja / Podgląd" },
  { value: PermissionLevel.CRUD, label: "Pełne (CRUD)" },
];

export function PermissionsPage() {
  const { reloadPermissions } = useAuth();
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/permissions", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać uprawnień.");
        return res.json();
      })
      .then((data) => {
        setMatrix(data.permissions);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  function updateLevel(role: string, section: string, level: string) {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [section]: level,
      },
    }));
    setSuccess(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: matrix }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Błąd zapisu uprawnień.");
        toast.error(data.message || "Nie udało się zapisać uprawnień");
        return;
      }

      setSuccess("Uprawnienia zostały zaktualizowane.");
      toast.success("Uprawnienia zostały zapisane");
      await reloadPermissions();
    } catch {
      setError("Błąd serwera. Spróbuj ponownie.");
      toast.error("Błąd serwera. Spróbuj ponownie");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ListSkeleton />;
  }

  return (
    <div>
      <div className="mb-lg flex items-center justify-between">
        <h1 className="text-heading font-semibold text-primary">
          Użytkownicy systemu
        </h1>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-white hover:bg-primary-hover"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-xl flex gap-sm border-b border-border">
        <Link
          to="/admin/users"
          className="px-md py-sm text-sm text-text-muted hover:text-text transition-colors"
        >
          Lista użytkowników
        </Link>
        <span className="px-md py-sm text-sm font-semibold text-primary border-b-2 border-primary">
          Uprawnienia ról
        </span>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-lg">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="info" className="mb-lg">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Rola</TableHead>
              {SECTIONS.map((s) => (
                <TableHead key={s.key}>{s.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role.key}>
                <TableCell className="font-medium">{role.label}</TableCell>
                {SECTIONS.map((section) => {
                  const currentLevel =
                    matrix[role.key]?.[section.key] ?? PermissionLevel.NONE;
                  const isLocked =
                    role.key === UserRole.SUPERADMIN ||
                    (role.key === UserRole.ADMINISTRATOR &&
                      section.key === "administracja");

                  return (
                    <TableCell key={section.key}>
                      {isLocked ? (
                        <span className="text-sm text-text-muted">
                          Pełne (CRUD) — zablokowane
                        </span>
                      ) : (
                        <Select
                          value={currentLevel}
                          onValueChange={(val) =>
                            updateLevel(role.key, section.key, val)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVELS.map((lvl) => (
                              <SelectItem key={lvl.value} value={lvl.value}>
                                {lvl.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-md text-xs text-text-muted">
        Uwaga: zmiany uprawnień będą widoczne po ponownym zalogowaniu
        użytkowników z daną rolą.
      </p>
    </div>
  );
}
