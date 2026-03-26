import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { Tables } from "@/lib/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Phone, BookOpen, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type BookingWithService = Tables<"bookings"> & {
  services: { name: string } | null;
};

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

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
    },
    {
      title: "Questa settimana",
      value: weekRes.count || 0,
      icon: BookOpen,
      description: "Ultimi 7 giorni",
    },
    {
      title: "Chiamate AI",
      value: callsRes.count || 0,
      icon: Phone,
      description: "Ultimi 7 giorni",
    },
    {
      title: "Tasso prenotazione",
      value:
        callsRes.count && weekRes.count
          ? `${Math.round(((weekRes.count || 0) / (callsRes.count || 1)) * 100)}%`
          : "N/A",
      icon: TrendingUp,
      description: "Chiamate convertite",
    },
  ];

  const upcoming = (upcomingRes.data || []) as BookingWithService[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica delle prenotazioni e attività
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prossime prenotazioni</CardTitle>
          <CardDescription>
            Le prossime 10 prenotazioni confermate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nessuna prenotazione in programma
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => {
                const serviceName = (booking as Record<string, unknown>).services
                  ? ((booking as Record<string, unknown>).services as { name: string })?.name
                  : null;
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {booking.customer_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {booking.customer_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.customer_phone}
                          {serviceName && ` · ${serviceName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {booking.start_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.date + "T00:00:00"), "d MMM", {
                          locale: it,
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        booking.source === "phone_ai" ? "default" : "secondary"
                      }
                      className="ml-2"
                    >
                      {booking.source === "phone_ai" ? "AI" : "Manuale"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
