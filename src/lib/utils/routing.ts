import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";

const MAX_DISTANCE_KM = 20;
/** Travel buffer between consecutive appointments (minutes) */
const TRAVEL_BUFFER_MINUTES = 20;

export interface RoutingResult {
  allowed: boolean;
  /** Human-readable reason when not allowed */
  reason?: string;
  /** Set when urgent booking is allowed despite constraint */
  warning?: string;
}

/**
 * Haversine formula – returns distance in km between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type BookingWithGeo = Pick<
  Tables<"bookings">,
  "start_time" | "end_time" | "latitude" | "longitude" | "status"
>;

/**
 * Returns the time in minutes since midnight for a "HH:MM:SS" or "HH:MM" string.
 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Check whether inserting a new booking at `slotTime` on `date` with coordinates
 * `(lat, lng)` respects the routing constraint (max 20 km from adjacent bookings,
 * with a 20-minute travel buffer).
 *
 * - If `isUrgent` is true and no valid slot exists, the booking is allowed with a warning.
 * - Returns `allowed: false` only for non-urgent bookings that violate the constraint.
 */
export async function checkRoutingConstraint(
  businessId: string,
  date: string,
  slotTime: string,
  lat: number,
  lng: number,
  isUrgent: boolean
): Promise<RoutingResult> {
  const supabase = createAdminClient();

  // Load all confirmed/completed bookings for the day that have coordinates
  const { data } = await supabase
    .from("bookings")
    .select("start_time, end_time, latitude, longitude, status")
    .eq("business_id", businessId)
    .eq("date", date)
    .in("status", ["confirmed", "completed"])
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("start_time");

  if (!data || data.length === 0) {
    // No existing bookings with geo — no constraint applies
    return { allowed: true };
  }

  const bookings = data as BookingWithGeo[];
  const newStartMin = timeToMinutes(slotTime);

  // Find previous and next bookings considering travel buffer
  const prev = [...bookings]
    .reverse()
    .find((b) => timeToMinutes(b.end_time) + TRAVEL_BUFFER_MINUTES <= newStartMin);

  const next = bookings.find(
    (b) => timeToMinutes(b.start_time) >= newStartMin + TRAVEL_BUFFER_MINUTES
  );

  const violations: string[] = [];

  if (prev?.latitude != null && prev?.longitude != null) {
    const d = haversineDistance(prev.latitude, prev.longitude, lat, lng);
    if (d > MAX_DISTANCE_KM) {
      violations.push(
        `distanza dall'appuntamento precedente: ${d.toFixed(1)} km (max ${MAX_DISTANCE_KM} km)`
      );
    }
  }

  if (next?.latitude != null && next?.longitude != null) {
    const d = haversineDistance(lat, lng, next.latitude, next.longitude);
    if (d > MAX_DISTANCE_KM) {
      violations.push(
        `distanza dall'appuntamento successivo: ${d.toFixed(1)} km (max ${MAX_DISTANCE_KM} km)`
      );
    }
  }

  if (violations.length === 0) {
    return { allowed: true };
  }

  const reason = `Vincolo routing non rispettato: ${violations.join("; ")}.`;

  if (isUrgent) {
    return {
      allowed: true,
      warning: `Prenotazione urgente inserita nonostante: ${reason}`,
    };
  }

  return { allowed: false, reason };
}

/**
 * Get business coordinates (origin for the first appointment of the day).
 */
export async function getBusinessCoordinates(
  businessId: string
): Promise<{ lat: number; lng: number } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select("latitude, longitude")
    .eq("id", businessId)
    .single();

  if (!data?.latitude || !data?.longitude) return null;
  return { lat: data.latitude, lng: data.longitude };
}
