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
import type { Airfield } from "shared/types";

export function AirfieldsPage() {
  const navigate = useNavigate();
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <Button
          onClick={() => navigate("/admin/airfields/new")}
          className="bg-primary text-white hover:bg-primary-hover"
        >
          <Plus className="mr-sm h-4 w-4" />
          Dodaj lądowisko
        </Button>
      </div>

      {isLoading && <p className="text-body text-text-muted">Ładowanie...</p>}

      {error && (
        <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {error}
        </div>
      )}

      {!isLoading && !error && airfields.length === 0 && (
        <p className="text-body text-text-muted">
          Brak lądowisk. Dodaj pierwsze lądowisko.
        </p>
      )}

      {!isLoading && !error && airfields.length > 0 && (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Szerokość geogr.</TableHead>
                <TableHead>Długość geogr.</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {airfields.map((airfield) => (
                <TableRow key={airfield.id}>
                  <TableCell className="font-medium">{airfield.name}</TableCell>
                  <TableCell>{airfield.latitude}</TableCell>
                  <TableCell>{airfield.longitude}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
