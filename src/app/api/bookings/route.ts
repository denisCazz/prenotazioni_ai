import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const search = searchParams.get("search");
  const offset = (page - 1) * limit;

  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const supabase = createAdminClient();

  let query = supabase
    .from("bookings")
    .select("*, services(name)", { count: "exact" })
    .eq("business_id", profile.business_id);

  if (status) query = query.eq("status", status);
  if (date) query = query.eq("date", date);
  if (dateFrom) query = query.gte("date", dateFrom);
  if (dateTo) query = query.lte("date", dateTo);
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);

  const { data, error, count } = await query
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: count || 0, page, limit });
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const supabase = createAdminClient();
  const body = await request.json();
  const startTime = body.start_time?.length === 5 ? `${body.start_time}:00` : body.start_time;
  const endTime = body.end_time?.length === 5 ? `${body.end_time}:00` : body.end_time;

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...body,
      business_id: profile.business_id,
      start_time: startTime,
      end_time: endTime,
      source: "dashboard",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID obbligatorio" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .eq("business_id", profile.business_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
