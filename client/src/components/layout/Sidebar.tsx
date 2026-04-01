import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  MapPin,
  UserCog,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  MoreVertical,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function HelicopterIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3h18" />
      <path d="M12 3v7" />
      <path d="M5 10h14l-2 5H7l-2-5z" />
      <path d="M12 15v4" />
      <path d="M8 19h8" />
      <path d="M19 10l2 2" />
    </svg>
  );
}
import { ROLE_DISPLAY_PL } from "shared/roles";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import type { MenuSection } from "shared/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  key: MenuSection;
  label: string;
  items: NavItem[];
}

// Top-level items (always visible, no permission gating)
const TOP_NAV_ITEMS: NavItem[] = [
  { label: "Pulpit", path: "/", icon: LayoutDashboard },
];

const NAV_SECTIONS: NavSection[] = [
  {
    key: "administracja",
    label: "ADMINISTRACJA",
    items: [
      { label: "Helikoptery", path: "/admin/helicopters", icon: HelicopterIcon },
      { label: "Członkowie załogi", path: "/admin/crew", icon: Users },
      { label: "Lądowiska planowe", path: "/admin/airfields", icon: MapPin },
      { label: "Użytkownicy", path: "/admin/users", icon: UserCog },
    ],
  },
  {
    key: "planowanie_operacji",
    label: "PLANOWANIE OPERACJI",
    items: [
      {
        label: "Lista operacji",
        path: "/operations",
        icon: ClipboardList,
      },
    ],
  },
  {
    key: "zlecenia_na_lot",
    label: "ZLECENIA NA LOT",
    items: [
      { label: "Lista zleceń", path: "/flight-orders", icon: FileText },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, permissions, logout } = useAuth();
  const location = useLocation();

  // Determine default collapsed state based on window width
  const getDefaultCollapsed = () => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 768 && window.innerWidth < 1280;
  };

  const [collapsed, setCollapsed] = useState(getDefaultCollapsed);

  // Update on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setCollapsed(false);
      } else if (window.innerWidth >= 768) {
        setCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) return null;

  // Filter sections by role permissions (D-07: not in DOM, not just hidden)
  const visibleSections = NAV_SECTIONS.filter((section) => {
    if (!permissions) return false;
    const level = permissions[section.key];
    return level && level !== PermissionLevel.NONE;
  });

  const sidebarContent = (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        {/* Sidebar header */}
        <div className="flex h-14 items-center border-b border-border-subtle px-md gap-sm">
          <img src="/favicon.svg" alt="AERO" className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <span className="text-heading font-semibold text-primary">AERO</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-lg">
          {/* Top-level items */}
          <div className="mb-lg">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/");
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.path}
                        className={cn(
                          "flex h-10 w-full items-center justify-center transition-colors",
                          isActive
                            ? "bg-primary text-white"
                            : "text-text hover:bg-border-subtle"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex h-10 items-center gap-sm px-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-text hover:bg-border-subtle"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {visibleSections.map((section) => (
            <div key={section.key} className="mb-lg">
              {/* Section header */}
              {!collapsed && (
                <div className="mb-sm px-md">
                  <span className="text-label font-semibold text-primary uppercase tracking-wide">
                    {section.label}
                  </span>
                </div>
              )}
              {collapsed && (
                <div className="mb-sm px-2">
                  <div className="h-px bg-border-subtle" />
                </div>
              )}

              {/* Nav items */}
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.path}
                          className={cn(
                            "flex h-10 w-full items-center justify-center transition-colors",
                            isActive
                              ? "bg-primary text-white"
                              : "text-text hover:bg-border-subtle"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex h-10 items-center gap-sm px-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-text hover:bg-border-subtle"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile with context menu */}
        <div className="border-t border-border-subtle px-sm py-sm">
          <Popover>
            <PopoverTrigger asChild>
              {!collapsed ? (
                <button className="flex w-full items-center gap-sm rounded-md px-sm py-sm transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-text truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {ROLE_DISPLAY_PL[user.role]}
                    </p>
                  </div>
                  <MoreVertical className="h-4 w-4 shrink-0 text-text-muted" />
                </button>
              ) : (
                <button className="flex h-10 w-full items-center justify-center rounded-md transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                </button>
              )}
            </PopoverTrigger>
            <PopoverContent
              side={collapsed ? "right" : "top"}
              align="start"
              className="w-56 p-0"
            >
              <div className="border-b border-border px-md py-sm">
                <p className="text-sm font-semibold text-text">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-text-muted">{user.email}</p>
                <p className="mt-xs text-xs text-text-muted">
                  {ROLE_DISPLAY_PL[user.role]}
                </p>
              </div>
              <div className="p-xs">
                <button
                  onClick={logout}
                  className="flex h-9 w-full items-center gap-sm rounded-md px-sm text-sm text-accent transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <LogOut className="h-4 w-4" />
                  Wyloguj się
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-border-subtle p-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex h-11 w-11 min-w-[44px] min-h-[44px] items-center justify-center rounded-md text-secondary transition-colors hover:bg-border-subtle hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={collapsed ? "Rozwiń menu" : "Zwiń menu"}
              >
                {collapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{collapsed ? "Rozwiń menu" : "Zwiń menu"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop/tablet sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-surface border-r border-border-subtle transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-surface border-r border-border-subtle md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
