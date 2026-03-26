import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Tables } from "@/lib/types/database";

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getProfile(): Promise<Tables<"profiles"> | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Tables<"profiles"> | null;
}

export async function requireProfile(): Promise<Tables<"profiles">> {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}
