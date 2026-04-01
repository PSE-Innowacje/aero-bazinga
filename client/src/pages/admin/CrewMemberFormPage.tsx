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
import { CREW_ROLES } from "shared/crew-roles";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";

// Email validation matching CREW-03 server-side rule
function isValidCrewEmail(email: string): boolean {
  const pattern = /^[a-zA-Z0-9.\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(email)) return false;
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  const parts = email.split("@");
  const domain = parts[1];
  if (!domain) return false;
  const segments = domain.split(".");
  return segments.length >= 2 && segments.every((s) => s.length > 0);
}

const crewMemberSchema = z
  .object({
    first_name: z
      .string()
      .min(1, "Imię jest wymagane")
      .max(100, "Imię max 100 znaków"),
    last_name: z
      .string()
      .min(1, "Nazwisko jest wymagane")
      .max(100, "Nazwisko max 100 znaków"),
    email: z
      .string()
      .min(1, "Email jest wymagany")
      .max(100, "Email max 100 znaków")
      .refine(isValidCrewEmail, { message: "Nieprawidłowy format adresu email" }),
    weight_kg: z
      .number({ invalid_type_error: "Podaj liczbę" })
      .min(30, "Min. 30 kg")
      .max(200, "Max. 200 kg"),
    role: z.string().min(1, "Rola jest wymagana"),
    pilot_license_number: z
      .string()
      .max(30, "Numer licencji max 30 znaków")
      .optional()
      .or(z.literal("")),
    license_expiry_date: z.string().optional().or(z.literal("")),
    training_expiry_date: z.string().min(1, "Data ważności szkolenia jest wymagana"),
  })
  .superRefine((data, ctx) => {
    if (data.role === "Pilot") {
      if (!data.pilot_license_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Numer licencji jest wymagany dla Pilota",
          path: ["pilot_license_number"],
        });
      }
      if (!data.license_expiry_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data ważności licencji jest wymagana dla Pilota",
          path: ["license_expiry_date"],
        });
      }
    }
  });

type CrewMemberFormValues = z.infer<typeof crewMemberSchema>;

export function CrewMemberFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;

  if (!canEdit) {
    navigate("/admin/crew");
    return null;
  }

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);

  const form = useForm<CrewMemberFormValues>({
    resolver: zodResolver(crewMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      weight_kg: 70,
      role: "",
      pilot_license_number: "",
      license_expiry_date: "",
      training_expiry_date: "",
    },
  });

  const watchedRole = form.watch("role");

  // Clear pilot fields when role changes away from Pilot
  useEffect(() => {
    if (watchedRole !== "Pilot") {
      form.setValue("pilot_license_number", "");
      form.setValue("license_expiry_date", "");
    }
  }, [watchedRole, form]);

  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/admin/crew/${id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Nie udało się pobrać danych członka załogi.");
          return res.json();
        })
        .then((data) => {
          const m = data.crewMember;
          form.reset({
            first_name: m.first_name,
            last_name: m.last_name,
            email: m.email,
            weight_kg: m.weight_kg,
            role: m.role,
            pilot_license_number: m.pilot_license_number || "",
            license_expiry_date: m.license_expiry_date
              ? m.license_expiry_date.substring(0, 10)
              : "",
            training_expiry_date: m.training_expiry_date.substring(0, 10),
          });
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setServerError(err.message);
          setIsLoading(false);
        });
    }
  }, [id, isEdit, form]);

  async function onSubmit(values: CrewMemberFormValues) {
    setServerError(null);
    const body = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      weight_kg: values.weight_kg,
      role: values.role,
      pilot_license_number: values.role === "Pilot" ? values.pilot_license_number || null : null,
      license_expiry_date: values.role === "Pilot" ? values.license_expiry_date || null : null,
      training_expiry_date: values.training_expiry_date,
    };

    const url = isEdit ? `/api/admin/crew/${id}` : "/api/admin/crew";
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
      navigate("/admin/crew");
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
        to="/admin/crew"
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Członkowie załogi
      </Link>

      <h1 className="mb-xl text-heading font-semibold text-primary">
        {isEdit ? "Edytuj członka załogi" : "Nowy członek załogi"}
      </h1>

      {serverError && (
        <div className="mb-lg rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwisko</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-md">
            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Waga (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={30}
                      max={200}
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rola</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz rolę" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CREW_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Pilot-conditional fields — rendered ONLY when role = "Pilot" */}
          {watchedRole === "Pilot" && (
            <>
              <FormField
                control={form.control}
                name="pilot_license_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numer licencji pilota</FormLabel>
                    <FormControl>
                      <Input placeholder="np. PL-PPL-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license_expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data ważności licencji</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="training_expiry_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data ważności szkolenia</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
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
