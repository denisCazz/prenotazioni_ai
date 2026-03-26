import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const assistantId = body.message?.call?.assistantId;

  if (!assistantId) {
    return NextResponse.json({ error: "Assistant ID mancante" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: businessRaw } = await supabase
    .from("businesses")
    .select("*")
    .eq("vapi_assistant_id", assistantId)
    .single();

  const business = businessRaw as Tables<"businesses"> | null;

  if (!business) {
    return NextResponse.json({ error: "Business non trovato" }, { status: 404 });
  }

  const [servicesRes, slotsRes] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id).eq("active", true),
    supabase.from("availability_slots").select("*").eq("business_id", business.id).eq("is_active", true).order("day_of_week"),
  ]);

  return NextResponse.json({
    business: {
      name: business.name,
      type: business.type,
      address: business.address,
    },
    services: servicesRes.data || [],
    availability: slotsRes.data || [],
  });
}
