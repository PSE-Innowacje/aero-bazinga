import React, { createContext, useContext, useEffect, useState } from "react";
import type { SessionUser } from "shared/types";
import type { PermissionLevel, MenuSection } from "shared/permissions";

type RolePermissions = Record<MenuSection, PermissionLevel>;

interface AuthContextValue {
  user: SessionUser | null;
  permissions: RolePermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from server (AUTH-02)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setPermissions(data.permissions ?? null);
        } else {
          setUser(null);
          setPermissions(null);
        }
      } catch {
        setUser(null);
        setPermissions(null);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Błąd logowania.");
    }

    const data = await res.json();
    setUser(data.user);
    setPermissions(data.permissions ?? null);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setPermissions(null);
      window.location.href = "/login";
    }
  };

  const reloadPermissions = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions ?? null);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        reloadPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
