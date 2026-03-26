import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";

const SESSION_COOKIE_NAME = "bitora_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface SessionPayload {
  profileId: string;
  expiresAt: number;
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET non configurata");
  }
  return secret;
}

function signSessionValue(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signSessionValue(value);
  return `${value}.${signature}`;
}

function decodeSession(token?: string) {
  if (!token) return null;

  const [value, signature] = token.split(".");
  if (!value || !signature) return null;

  const expectedSignature = signSessionValue(value);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
    if (payload.expiresAt <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false;

  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;

  const derivedKey = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (derivedKey.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedBuffer);
}

export async function createSession(profileId: string) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession({ profileId, expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getProfile(): Promise<Tables<"profiles"> | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.profileId)
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
