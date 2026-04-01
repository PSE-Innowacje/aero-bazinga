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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserRole, ROLE_DISPLAY_PL } from "shared/roles";
import { FormSkeleton } from "@/components/ui/skeleton";
import { PermissionLevel } from "shared/permissions";
import { useAuth } from "@/context/AuthContext";
import type { CrewMember } from "shared/types";

// Email validation per CREW-03 / USR-01
function isValidEmail(email: string): boolean {
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

const userSchemaBase = z.object({
  first_name: z.string().min(1, "Imię jest wymagane").max(100, "Imię max 100 znaków"),
  last_name: z.string().min(1, "Nazwisko jest wymagane").max(100, "Nazwisko max 100 znaków"),
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .max(100, "Email max 100 znaków")
    .refine(isValidEmail, { message: "Nieprawidłowy format adresu email" }),
  role: z.string().min(1, "Rola jest wymagana"),
  password: z.string().optional().or(z.literal("")),
  crew_member_id: z.number().optional().nullable(),
});

const userSchema = userSchemaBase.superRefine((data, ctx) => {
  if (data.role === UserRole.PILOT && !data.crew_member_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wymagane powiązanie z członkiem załogi dla roli Pilot",
      path: ["crew_member_id"],
    });
  }
});

type UserFormValues = z.infer<typeof userSchema>;

export function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user: currentUser, permissions } = useAuth();
  const canEdit = permissions?.administracja === PermissionLevel.CRUD;

  if (!canEdit) {
    navigate("/admin/users");
    return null;
  }

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [pilotCrew, setPilotCrew] = useState<CrewMember[]>([]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      role: "",
      password: "",
      crew_member_id: null,
    },
  });

  const watchedRole = form.watch("role");

  // Fetch pilot crew members when role is Pilot
  useEffect(() => {
    if (watchedRole === UserRole.PILOT) {
      fetch("/api/admin/crew", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          const pilots = (data.crew as CrewMember[]).filter((c) => c.role === "Pilot");
          setPilotCrew(pilots);
        })
        .catch(() => {
          // silently fail — form will show empty select
        });
    }
  }, [watchedRole]);

  // Clear crew_member_id when role changes away from Pilot
  useEffect(() => {
    if (watchedRole !== UserRole.PILOT) {
      form.setValue("crew_member_id", null);
    }
  }, [watchedRole, form]);

  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/admin/users/${id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Nie udało się pobrać danych użytkownika.");
          return res.json();
        })
        .then((data) => {
          const u = data.user;
          form.reset({
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            role: u.role,
            password: "",
            crew_member_id: u.crew_member_id,
          });
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setServerError(err.message);
          setIsLoading(false);
        });
    }
  }, [id, isEdit, form]);

  async function onSubmit(values: UserFormValues) {
    setServerError(null);
    const body: Record<string, unknown> = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      role: values.role,
      crew_member_id: values.role === UserRole.PILOT ? values.crew_member_id : null,
    };
    if (values.password) {
      body.password = values.password;
    }
    if (!isEdit) {
      if (!values.password) {
        form.setError("password", { message: "Hasło jest wymagane" });
        return;
      }
      body.password = values.password;
    }

    const url = isEdit ? `/api/admin/users/${id}` : "/api/admin/users";
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
        toast.error(data.message || "Nie udało się zapisać użytkownika");
        return;
      }
      toast.success(isEdit ? "Zmiany zostały zapisane" : "Użytkownik został utworzony");
      navigate("/admin/users");
    } catch {
      setServerError("Błąd serwera. Skontaktuj się z administratorem.");
      toast.error("Błąd serwera. Skontaktuj się z administratorem");
    }
  }

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="max-w-lg">
      <Link
        to="/admin/users"
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Użytkownicy systemu
      </Link>

      <h1 className="mb-xl text-heading font-semibold text-primary">
        {isEdit ? "Edytuj użytkownika" : "Nowy użytkownik"}
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
                    {Object.values(UserRole).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_DISPLAY_PL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hasło</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                {isEdit && (
                  <FormDescription>
                    Pozostaw puste, aby nie zmieniać hasła
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* AUTH-04: crew_member_id shown only when role = Pilot */}
          {watchedRole === UserRole.PILOT && (
            <FormField
              control={form.control}
              name="crew_member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Powiązany członek załogi</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    value={field.value != null ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz pilota z listy załogi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pilotCrew.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.first_name} {c.last_name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Wymagane dla roli Pilot</FormDescription>
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
