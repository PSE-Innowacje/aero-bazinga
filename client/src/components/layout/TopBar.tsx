import React from "react";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_DISPLAY_PL } from "shared/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onMobileMenuToggle: () => void;
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface px-md shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-md">
        {/* Mobile hamburger */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-md text-secondary hover:bg-border-subtle md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onMobileMenuToggle}
          aria-label="Otwórz menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Product name */}
        <span className="text-heading font-semibold text-primary">AERO</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-md">
        {/* Role badge */}
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {ROLE_DISPLAY_PL[user.role]}
        </Badge>

        {/* User name */}
        <span className="hidden sm:block text-sm text-text">
          {user.firstName} {user.lastName}
        </span>

        {/* Logout button — immediate, no confirmation per UI-SPEC */}
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-xs text-accent hover:text-accent-hover focus-visible:ring-accent"
          onClick={logout}
          aria-label="Wyloguj się"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Wyloguj się</span>
        </Button>
      </div>
    </header>
  );
}
