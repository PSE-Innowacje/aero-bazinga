import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const airfieldSchema = z.object({
  name: z
    .string()
    .min(1, "Nazwa jest wymagana")
    .max(200, "Nazwa max 200 znaków"),
  latitude: z
    .number({ invalid_type_error: "Podaj liczbę" })
    .min(-90, "Zakres: -90 do 90")
    .max(90, "Zakres: -90 do 90"),
  longitude: z
    .number({ invalid_type_error: "Podaj liczbę" })
    .min(-180, "Zakres: -180 do 180")
    .max(180, "Zakres: -180 do 180"),
});

type AirfieldFormValues = z.infer<typeof airfieldSchema>;

export function AirfieldFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);

  const form = useForm<AirfieldFormValues>({
    resolver: zodResolver(airfieldSchema),
    defaultValues: {
      name: "",
      latitude: 52.2297,
      longitude: 21.0122,
    },
  });

  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/admin/airfields/${id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Nie udało się pobrać danych lądowiska.");
          return res.json();
        })
        .then((data) => {
          const a = data.airfield;
          form.reset({
            name: a.name,
            latitude: a.latitude,
            longitude: a.longitude,
          });
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setServerError(err.message);
          setIsLoading(false);
        });
    }
  }, [id, isEdit, form]);

  async function onSubmit(values: AirfieldFormValues) {
    setServerError(null);
    const url = isEdit ? `/api/admin/airfields/${id}` : "/api/admin/airfields";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || "Błąd serwera.");
        return;
      }
      navigate("/admin/airfields");
    } catch {
      setServerError("Błąd serwera. Skontaktuj się z administratorem.");
    }
  }

  if (isLoading) {
    return <p className="text-body text-text-muted">Ładowanie...</p>;
  }

  return (
    <div className="max-w-lg">
      <Link
        to="/admin/airfields"
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Lądowiska planowe
      </Link>

      <h1 className="mb-xl text-heading font-semibold text-primary">
        {isEdit ? "Edytuj lądowisko" : "Nowe lądowisko"}
      </h1>

      {serverError && (
        <div className="mb-lg rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-md">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa</FormLabel>
                <FormControl>
                  <Input placeholder="np. Lądowisko Warszawa-Praga" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Szerokość geograficzna</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>Np. 52.2297 (Warszawa)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Długość geograficzna</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>Np. 21.0122 (Warszawa)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-primary text-white hover:bg-primary-hover"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Zapisywanie..."
              : isEdit
              ? "Zapisz zmiany"
              : "Zapisz"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
