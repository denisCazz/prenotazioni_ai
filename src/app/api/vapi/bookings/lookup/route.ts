import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const params = body.message?.functionCall?.parameters || body;
  const { customer_phone } = params;

  if (!customer_phone) {
    return NextResponse.json({ error: "Telefono obbligatorio" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .eq("customer_phone", customer_phone)
    .eq("status", "confirmed")
    .gte("date", today)
    .order("date")
    .order("start_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data || [] });
}
