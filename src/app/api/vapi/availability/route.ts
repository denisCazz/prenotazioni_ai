import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { getAvailableSlots } from "@/lib/utils/availability";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body;
  const params = message?.functionCall?.parameters || body;
  const { date, business_id } = params;

  if (!date) {
    return NextResponse.json({ error: "Data obbligatoria" }, { status: 400 });
  }

  const supabase = createAdminClient();

  let businessId = business_id;
  if (!businessId && message?.call?.assistantId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", message.call.assistantId)
      .single();
    businessId = biz?.id;
  }

  if (!businessId) {
    return NextResponse.json({ error: "Business non trovato" }, { status: 404 });
  }

  const [slotsRes, exceptionsRes, bookingsRes] = await Promise.all([
    supabase.from("availability_slots").select("*").eq("business_id", businessId),
    supabase.from("availability_exceptions").select("*").eq("business_id", businessId).eq("date", date),
    supabase.from("bookings").select("start_time, end_time, status").eq("business_id", businessId).eq("date", date).neq("status", "cancelled"),
  ]);

  const available = getAvailableSlots(
    date,
    (slotsRes.data ?? []) as Tables<"availability_slots">[],
    (exceptionsRes.data ?? []) as Tables<"availability_exceptions">[],
    (bookingsRes.data ?? []) as Pick<Tables<"bookings">, "start_time" | "end_time" | "status">[]
  );

  return NextResponse.json({ slots: available, date });
}
