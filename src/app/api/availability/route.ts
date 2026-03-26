import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const supabase = createAdminClient();

  const [slotsRes, exceptionsRes] = await Promise.all([
    supabase.from("availability_slots").select("*").eq("business_id", profile.business_id).order("day_of_week").order("start_time"),
    supabase.from("availability_exceptions").select("*").eq("business_id", profile.business_id).order("date"),
  ]);

  return NextResponse.json({
    slots: slotsRes.data || [],
    exceptions: exceptionsRes.data || [],
  });
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const supabase = createAdminClient();
  const body = await request.json();
  const { type, ...data } = body;

  if (type === "exception") {
    const { data: result, error } = await supabase
      .from("availability_exceptions")
      .insert({ ...data, business_id: profile.business_id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(result, { status: 201 });
  }

  const { data: result, error } = await supabase
    .from("availability_slots")
    .insert({ ...data, business_id: profile.business_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  if (!id) return NextResponse.json({ error: "ID obbligatorio" }, { status: 400 });

  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const supabase = createAdminClient();
  const table = type === "exception" ? "availability_exceptions" : "availability_slots";
  const { error } = await supabase.from(table).delete().eq("id", id).eq("business_id", profile.business_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
