import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import type { Helicopter } from "shared/types";

export function HelicoptersPage() {
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;
  const [helicopters, setHelicopters] = useState<Helicopter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredHelicopters = useMemo(() => {
    if (!search.trim()) return helicopters;
    const q = search.toLowerCase();
    return helicopters.filter(h =>
      h.registration_number?.toLowerCase().includes(q) ||
      h.type?.toLowerCase().includes(q)
    );
  }, [helicopters, search]);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/admin/helicopters", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać listy helikopterów.");
        return res.json();
      })
      .then((data) => {
        setHelicopters(data.helicopters);
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
        <h1 className="text-heading font-semibold text-primary">Helikoptery</h1>
        {canEdit && (
          <Button
            onClick={() => navigate("/admin/helicopters/new")}
            className="bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="mr-sm h-4 w-4" />
            Dodaj helikopter
          </Button>
        )}
      </div>

      <div className="mb-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Szukaj po nr rejestracyjnym lub typie..." />
      </div>

      {isLoading && <ListSkeleton />}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && filteredHelicopters.length === 0 && (
        <p className="text-body text-text-muted">
          Brak helikopterów. Dodaj pierwszy helikopter.
        </p>
      )}

      {!isLoading && !error && filteredHelicopters.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numer rejestracyjny</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHelicopters.map((helicopter) => (
                <TableRow key={helicopter.id}>
                  <TableCell className="font-medium">
                    {helicopter.registration_number}
                  </TableCell>
                  <TableCell>{helicopter.type}</TableCell>
                  <TableCell>
                    {helicopter.status === 1 ? (
                      <Badge className="bg-primary text-white">Aktywny</Badge>
                    ) : (
                      <Badge variant="destructive">Nieaktywny</Badge>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(`/admin/helicopters/${helicopter.id}/edit`)
                        }
                        aria-label="Edytuj helikopter"
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
