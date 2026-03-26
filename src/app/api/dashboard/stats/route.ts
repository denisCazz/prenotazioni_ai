import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [todayBookings, weekBookings, weekCalls, upcomingBookings] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .eq("business_id", profile.business_id)
      .eq("date", today)
      .neq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .eq("business_id", profile.business_id)
      .gte("date", weekAgo)
      .neq("status", "cancelled"),
    supabase
      .from("call_logs")
      .select("*", { count: "exact" })
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

  return NextResponse.json({
    today_bookings: todayBookings.count || 0,
    week_bookings: weekBookings.count || 0,
    week_calls: weekCalls.count || 0,
    upcoming: upcomingBookings.data || [],
  });
}
