import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import { ROLE_DISPLAY_PL } from "shared/roles";
import { UserRole } from "shared/roles";
import type { SystemUser } from "shared/types";

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/admin/users", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać listy użytkowników.");
        return res.json();
      })
      .then((data) => {
        setUsers(data.users);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-heading font-semibold text-primary">Użytkownicy systemu</h1>
        {canEdit && (
          <Button
            onClick={() => navigate("/admin/users/new")}
            className="bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="mr-sm h-4 w-4" />
            Dodaj użytkownika
          </Button>
        )}
      </div>

      {/* Tabs */}
      {canEdit && (
        <div className="mb-xl flex gap-sm border-b border-border">
          <span className="px-md py-sm text-sm font-semibold text-primary border-b-2 border-primary">
            Lista użytkowników
          </span>
          <Link
            to="/admin/permissions"
            className="px-md py-sm text-sm text-text-muted hover:text-text transition-colors"
          >
            Uprawnienia ról
          </Link>
        </div>
      )}

      {isLoading && <ListSkeleton />}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && users.length === 0 && (
        <p className="text-body text-text-muted">
          Brak użytkowników. Dodaj pierwszego użytkownika.
        </p>
      )}

      {!isLoading && !error && users.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                {canEdit && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {ROLE_DISPLAY_PL[user.role as UserRole] || user.role}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                        aria-label="Edytuj użytkownika"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
