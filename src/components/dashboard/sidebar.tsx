"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Phone,
  Settings,
  Wrench,
  Clock,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  businessName: string;
  businessType: string;
  userName: string;
  userRole: string;
}

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/bookings", label: "Prenotazioni", icon: BookOpen },
  { href: "/calls", label: "Chiamate", icon: Phone },
];

const settingsNav = [
  { href: "/settings", label: "Generale", icon: Settings },
  { href: "/settings/services", label: "Servizi", icon: Wrench },
  { href: "/settings/availability", label: "Orari", icon: Clock },
  { href: "/settings/ai-assistant", label: "Assistente AI", icon: Bot },
];

export function Sidebar({ businessName, businessType }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-sm font-bold shadow-md">
          {businessName.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{businessName}</p>
            <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
              {businessType}
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4 mx-2 bg-sidebar-border" />

        <div className="px-2">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/40 uppercase tracking-wider">
              Impostazioni
            </p>
          )}
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </ScrollArea>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-muted"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
