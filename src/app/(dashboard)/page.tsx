import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import type { Tables } from "@/lib/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Phone, BookOpen, TrendingUp, MapPin, Wrench } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";

type BookingWithService = Tables<"bookings"> & {
  services: { name: string } | null;
};

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const todayDate = new Date();
  const today = todayDate.toISOString().split("T")[0];
  const weekAgoDate = new Date(todayDate);
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgo = weekAgoDate.toISOString().split("T")[0];

  const [todayRes, weekRes, callsRes, upcomingRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("business_id", profile.business_id)
      .eq("date", today)
      .neq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("business_id", profile.business_id)
      .gte("date", weekAgo)
      .neq("status", "cancelled"),
    supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true })
      .eq("business_id", profile.business_id)
      .gte("started_at", `${weekAgo}T00:00:00`),
    supabase
      .from("bookings")
      .select("*, services(name)")
      .eq("business_id", profile.business_id)
      .gte("date", today)
      .eq("status", "confirmed")
      .order("date")
      .order("start_time")
      .limit(10),
  ]);

  const stats = [
    {
      title: "Prenotazioni oggi",
      value: todayRes.count || 0,
      icon: CalendarDays,
      description: format(new Date(), "EEEE d MMMM", { locale: it }),
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      border: "border-l-blue-500",
    },
    {
      title: "Questa settimana",
      value: weekRes.count || 0,
      icon: BookOpen,
      description: "Ultimi 7 giorni",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      border: "border-l-violet-500",
    },
    {
      title: "Chiamate AI",
      value: callsRes.count || 0,
      icon: Phone,
      description: "Ultimi 7 giorni",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      border: "border-l-emerald-500",
    },
    {
      title: "Tasso prenotazione",
      value:
        callsRes.count && weekRes.count
          ? `${Math.round(((weekRes.count || 0) / (callsRes.count || 1)) * 100)}%`
          : "N/A",
      icon: TrendingUp,
      description: "Chiamate convertite",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      border: "border-l-amber-500",
    },
  ];

  const upcoming = (upcomingRes.data || []) as BookingWithService[];

  // Group upcoming bookings by date
  const grouped = upcoming.reduce<Record<string, BookingWithService[]>>((acc, b) => {
    acc[b.date] = acc[b.date] ? [...acc[b.date], b] : [b];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={`border-l-4 ${stat.border} shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">Prossimi appuntamenti</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nessun appuntamento in programma
            </p>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([date, dayBookings]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {date === today
                      ? "Oggi"
                      : format(new Date(date + "T00:00:00"), "EEEE d MMMM", { locale: it })}
                  </p>
                  <div className="space-y-2">
                    {dayBookings.map((booking) => {
                      const serviceName = booking.services?.name ?? null;
                      return (
                        <Link
                          key={booking.id}
                          href={`/bookings/${booking.id}`}
                          className="flex items-center gap-4 rounded-xl border bg-card p-3 hover:bg-accent/40 transition-colors group"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {booking.customer_name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{booking.customer_name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {booking.service_address && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[180px]">{booking.service_address}</span>
                                </span>
                              )}
                              {serviceName && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Wrench className="h-3 w-3 shrink-0" />
                                  {serviceName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-primary">{booking.start_time.slice(0, 5)}</p>
                            <Badge
                              variant={booking.source === "phone_ai" ? "default" : "secondary"}
                              className="text-[10px] mt-1"
                            >
                              {booking.source === "phone_ai" ? "AI" : "Manuale"}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

