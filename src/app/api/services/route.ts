import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", profile.business_id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const body = await request.json();
  const { data, error } = await supabase
    .from("services")
    .insert({ ...body, business_id: profile.business_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("services")
    .update(updates)
    .eq("id", id)
    .eq("business_id", profile.business_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obbligatorio" }, { status: 400 });

  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", profile.business_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
