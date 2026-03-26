import { createSession, verifyPassword } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = body?.username?.trim().toLowerCase();
  const password = body?.password;

  if (!username || !password) {
    return NextResponse.json({ error: "Username e password sono obbligatori" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, password_hash")
    .ilike("username", username)
    .single();

  if (!profile || !verifyPassword(password, profile.password_hash)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  await createSession(profile.id);

  return NextResponse.json({ ok: true });
}