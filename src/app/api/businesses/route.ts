import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const supabase = createAdminClient();

  if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", profile.business_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const body = await request.json();
  const { data, error } = await supabase
    .from("businesses")
    .update(body)
    .eq("id", profile.business_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
