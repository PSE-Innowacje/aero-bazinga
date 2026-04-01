import React, { useEffect, useState, useMemo } from "react";
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
import { ListSkeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import type { Airfield } from "shared/types";

export function AirfieldsPage() {
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredAirfields = useMemo(() => {
    if (!search.trim()) return airfields;
    const q = search.toLowerCase();
    return airfields.filter(a =>
      a.name?.toLowerCase().includes(q)
    );
  }, [airfields, search]);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/admin/airfields", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać listy lądowisk.");
        return res.json();
      })
      .then((data) => {
        setAirfields(data.airfields);
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
        <h1 className="text-heading font-semibold text-primary">Lądowiska planowe</h1>
        {canEdit && (
          <Button
            onClick={() => navigate("/admin/airfields/new")}
            className="bg-primary text-white hover:bg-primary-hover"
          >
            <Plus className="mr-sm h-4 w-4" />
            Dodaj lądowisko
          </Button>
        )}
      </div>

      <div className="mb-md">
        <SearchInput value={search} onChange={setSearch} placeholder="Szukaj po nazwie..." />
      </div>

      {isLoading && <ListSkeleton />}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && filteredAirfields.length === 0 && (
        <p className="text-body text-text-muted">
          Brak lądowisk. Dodaj pierwsze lądowisko.
        </p>
      )}

      {!isLoading && !error && filteredAirfields.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Szerokość geogr.</TableHead>
                <TableHead>Długość geogr.</TableHead>
                {canEdit && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAirfields.map((airfield) => (
                <TableRow key={airfield.id}>
                  <TableCell className="font-medium">{airfield.name}</TableCell>
                  <TableCell>{airfield.latitude}</TableCell>
                  <TableCell>{airfield.longitude}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/airfields/${airfield.id}/edit`)}
                        aria-label="Edytuj lądowisko"
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
