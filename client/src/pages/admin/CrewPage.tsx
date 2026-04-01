import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import type { CrewMember } from "shared/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return dateStr.substring(0, 10);
}

export function CrewPage() {
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/admin/crew", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać listy członków załogi.");
        return res.json();
      })
      .then((data) => {
        setCrew(data.crew);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-xl">
        <h1 className="text-heading font-semibold text-primary">Członkowie załogi</h1>
        {canEdit && (
          <Button
            onClick={() => navigate("/admin/crew/new")}
            className="bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="mr-sm h-4 w-4" />
            Dodaj członka załogi
          </Button>
        )}
      </div>

      {isLoading && <p className="text-body text-text-muted">Ładowanie...</p>}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && crew.length === 0 && (
        <p className="text-body text-text-muted">
          Brak członków załogi. Dodaj pierwszego członka załogi.
        </p>
      )}

      {!isLoading && !error && crew.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Ważność licencji</TableHead>
                <TableHead>Ważność szkolenia</TableHead>
                {canEdit && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {crew.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{formatDate(member.license_expiry_date)}</TableCell>
                  <TableCell>{formatDate(member.training_expiry_date)}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/crew/${member.id}/edit`)}
                        aria-label="Edytuj członka załogi"
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
