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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";

const helicopterSchema = z
  .object({
    registration_number: z
      .string()
      .min(1, "Numer rejestracyjny jest wymagany")
      .max(30, "Numer rejestracyjny max 30 znaków"),
    type: z
      .string()
      .min(1, "Typ jest wymagany")
      .max(100, "Typ max 100 znaków"),
    description: z
      .string()
      .max(100, "Opis max 100 znaków")
      .optional()
      .or(z.literal("")),
    max_crew_count: z
      .number({ invalid_type_error: "Podaj liczbę" })
      .min(1, "Min. 1")
      .max(10, "Max. 10"),
    max_crew_payload_kg: z
      .number({ invalid_type_error: "Podaj liczbę" })
      .min(1, "Min. 1 kg")
      .max(1000, "Max. 1000 kg"),
    range_km: z
      .number({ invalid_type_error: "Podaj liczbę" })
      .min(1, "Min. 1 km")
      .max(1000, "Max. 1000 km"),
    status: z.enum(["0", "1"], { required_error: "Status jest wymagany" }),
    inspection_expiry_date: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.status === "1" && !data.inspection_expiry_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data przeglądu jest wymagana dla aktywnych helikopterów",
        path: ["inspection_expiry_date"],
      });
    }
  });

type HelicopterFormValues = z.infer<typeof helicopterSchema>;

export function HelicopterFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;

  if (!canEdit) {
    navigate("/admin/helicopters");
    return null;
  }

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);

  const form = useForm<HelicopterFormValues>({
    resolver: zodResolver(helicopterSchema),
    defaultValues: {
      registration_number: "",
      type: "",
      description: "",
      max_crew_count: 1,
      max_crew_payload_kg: 100,
      range_km: 100,
      status: "1",
      inspection_expiry_date: "",
    },
  });

  const watchedStatus = form.watch("status");

  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/admin/helicopters/${id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Nie udało się pobrać danych helikoptera.");
          return res.json();
        })
        .then((data) => {
          const h = data.helicopter;
          form.reset({
            registration_number: h.registration_number,
            type: h.type,
            description: h.description || "",
            max_crew_count: h.max_crew_count,
            max_crew_payload_kg: h.max_crew_payload_kg,
            range_km: h.range_km,
            status: String(h.status) as "0" | "1",
            inspection_expiry_date: h.inspection_expiry_date
              ? h.inspection_expiry_date.substring(0, 10)
              : "",
          });
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setServerError(err.message);
          setIsLoading(false);
        });
    }
  }, [id, isEdit, form]);

  async function onSubmit(values: HelicopterFormValues) {
    setServerError(null);
    const body = {
      registration_number: values.registration_number,
      type: values.type,
      description: values.description || null,
      max_crew_count: values.max_crew_count,
      max_crew_payload_kg: values.max_crew_payload_kg,
      range_km: values.range_km,
      status: parseInt(values.status, 10),
      inspection_expiry_date:
        values.status === "1" ? values.inspection_expiry_date || null : null,
    };

    const url = isEdit ? `/api/admin/helicopters/${id}` : "/api/admin/helicopters";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || "Błąd serwera.");
        return;
      }
      navigate("/admin/helicopters");
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
        to="/admin/helicopters"
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Helikoptery
      </Link>

      <h1 className="mb-xl text-heading font-semibold text-primary">
        {isEdit ? "Edytuj helikopter" : "Nowy helikopter"}
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
            name="registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numer rejestracyjny</FormLabel>
                <FormControl>
                  <Input placeholder="np. SP-HXA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typ</FormLabel>
                <FormControl>
                  <Input placeholder="np. PZL W-3 Sokół" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opis (opcjonalnie)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-md">
            <FormField
              control={form.control}
              name="max_crew_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liczba miejsc w załodze</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_crew_payload_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maks. ładunek załogi (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="range_km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zasięg (km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Aktywny</SelectItem>
                    <SelectItem value="0">Nieaktywny</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedStatus === "1" && (
            <FormField
              control={form.control}
              name="inspection_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data przeglądu</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    Wymagana dla aktywnych helikopterów
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
