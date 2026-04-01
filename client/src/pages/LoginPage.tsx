import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Uzupełnij wszystkie wymagane pola.")
    .email("Podaj prawidłowy adres email."),
  password: z.string().min(1, "Uzupełnij wszystkie wymagane pola."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Błąd serwera. Skontaktuj się z administratorem.";
      // Map server error messages to display messages
      if (
        message.includes("Nieprawidłowy email") ||
        message.includes("invalid_credentials")
      ) {
        setServerError("Nieprawidłowy email lub hasło. Spróbuj ponownie.");
      } else {
        setServerError("Błąd serwera. Skontaktuj się z administratorem.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-md">
      <Card
        className="w-full max-w-[400px]"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          paddingTop: "48px",
          paddingBottom: "48px",
          paddingLeft: "32px",
          paddingRight: "32px",
        }}
      >
        <CardContent className="p-0">
          {/* Product name */}
          <div className="mb-xs flex items-center gap-sm">
            <img src="/logo.svg" alt="AERO" className="h-10 w-10" />
            <h1 className="text-display font-semibold text-primary">
              AERO
            </h1>
          </div>

          {/* Subtitle */}
          <p className="mb-2xl text-body text-text-muted">
            System zarządzania operacjami lotniczymi
          </p>

          {/* Error alert */}
          {serverError && (
            <div
              className="mb-md rounded border border-accent bg-[#FFF5F5] px-md py-sm text-sm text-accent"
              role="alert"
            >
              {serverError}
            </div>
          )}

          {/* Login form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-md">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label font-semibold text-text">
                      Email
                    </FormLabel>
                    <div className="mt-sm">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder=""
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-label font-semibold text-text">
                      Hasło
                    </FormLabel>
                    <div className="mt-sm">
                      <FormControl>
                        <Input
                          type="password"
                          placeholder=""
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="mt-md h-[44px] w-full text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
