import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import {
  formatDateForVoice,
  getAvailableSlots,
  getFutureDateCandidates,
  isOnOrBeforeTodayInRome,
  normalizeFutureDate,
} from "@/lib/utils/availability";
import { geocodeAddress } from "@/lib/utils/geocoding";
import { checkRoutingConstraint, haversineDistance, MAX_DISTANCE_KM } from "@/lib/utils/routing";
import { createToolResponse, getToolContext } from "@/lib/vapi/responses";

export async function POST(request: Request) {
  const body = await request.json();
  const { toolCallId, parameters: params, assistantId } = getToolContext(body);
  const { date, business_id, service_name, days_ahead, service_address, urgency_level } = params;
  const businessIdFromParams = typeof business_id === "string" ? business_id : undefined;
  const requestedDate = typeof date === "string" ? normalizeFutureDate(date) : undefined;
  const requestedServiceName = typeof service_name === "string" ? service_name : undefined;
  const daysAhead = typeof days_ahead === "number" && days_ahead > 0 ? Math.min(days_ahead, 14) : 7;
  const serviceAddress = typeof service_address === "string" ? service_address : undefined;
  const isUrgent = urgency_level === "urgent";

  // Geocode the service address once
  const coords = serviceAddress ? await geocodeAddress(serviceAddress) : null;

  const supabase = createAdminClient();

  let businessId = businessIdFromParams;
  if (!businessId && assistantId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", assistantId)
      .single();
    businessId = biz?.id;
  }

  if (!businessId) {
    return createToolResponse("Errore: business non trovato.", toolCallId, 404);
  }

  const resolvedBusinessId = businessId;

  let service: Tables<"services"> | null = null;
  if (requestedServiceName && requestedServiceName.trim()) {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .ilike("name", `%${requestedServiceName}%`)
      .eq("active", true)
      .limit(1)
      .single();
    service = (data as Tables<"services"> | null) ?? null;
  }

  if (requestedDate && isOnOrBeforeTodayInRome(requestedDate)) {
    return createToolResponse(
      "Posso proporre solo appuntamenti successivi a oggi. Se vuole, controllo subito le prime disponibilità da domani in poi.",
      toolCallId,
      400
    );
  }

  const { data: weeklySlotsData } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("business_id", resolvedBusinessId);

  const weeklySlots = (weeklySlotsData ?? []) as Tables<"availability_slots">[];

  if (weeklySlots.length === 0) {
    return createToolResponse(
      "Le disponibilita dell'attivita non sono ancora configurate nel calendario. Occorre prima impostare le fasce orarie di apertura.",
      toolCallId
    );
  }

  // ── Pre-fetch all future bookings with coordinates in ONE query ──────────
  // Used to (a) identify "zone dates" efficiently and (b) feed routing checks.
  const today = new Date().toISOString().split("T")[0];
  const { data: geoBookingsData } = await supabase
    .from("bookings")
    .select("date, start_time, end_time, latitude, longitude, status")
    .eq("business_id", resolvedBusinessId)
    .in("status", ["confirmed", "completed"])
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("date", today);

  type GeoBooking = { date: string; start_time: string; end_time: string; latitude: number; longitude: number; status: string };
  const geoBookings = (geoBookingsData ?? []) as GeoBooking[];

  // Dates that already have at least one booking within MAX_DISTANCE_KM of the customer
  const zoneDates = new Set<string>();
  if (coords) {
    for (const b of geoBookings) {
      if (haversineDistance(b.latitude, b.longitude, coords.lat, coords.lng) <= MAX_DISTANCE_KM) {
        zoneDates.add(b.date);
      }
    }
  }

  // Build a per-date map for routing checks (avoids repeated DB queries per slot)
  const bookingsByDate = new Map<string, GeoBooking[]>();
  for (const b of geoBookings) {
    const list = bookingsByDate.get(b.date) ?? [];
    list.push(b);
    bookingsByDate.set(b.date, list);
  }

  async function loadAvailability(targetDate: string): Promise<{ start_time: string }[]> {
    const [exceptionsRes, bookingsRes] = await Promise.all([
      supabase.from("availability_exceptions").select("*").eq("business_id", resolvedBusinessId).eq("date", targetDate),
      supabase.from("bookings").select("start_time, end_time, status").eq("business_id", resolvedBusinessId).eq("date", targetDate).neq("status", "cancelled"),
    ]);

    const allSlots = getAvailableSlots(
      targetDate,
      weeklySlots,
      (exceptionsRes.data ?? []) as Tables<"availability_exceptions">[],
      (bookingsRes.data ?? []) as Pick<Tables<"bookings">, "start_time" | "end_time" | "status">[],
      service ? { duration_minutes: service.duration_minutes, max_concurrent: service.max_concurrent } : undefined
    );

    // Apply routing filter only if we have coords AND bookings with geo on that day
    if (!coords) return allSlots;
    const dayBookings = bookingsByDate.get(targetDate);
    if (!dayBookings || dayBookings.length === 0) return allSlots;

    const filtered: typeof allSlots = [];
    for (const slot of allSlots) {
      const routing = await checkRoutingConstraint(
        resolvedBusinessId,
        targetDate,
        slot.start_time,
        coords.lat,
        coords.lng,
        isUrgent
      );
      if (routing.allowed) filtered.push(slot);
    }
    return filtered;
  }

  function fmtSlot(d: string, t: string) {
    return `${formatDateForVoice(d)} alle ${t.slice(0, 5)}`;
  }

  const futureDates = Array.from(getFutureDateCandidates(Math.max(daysAhead, 14)));

  // PASS 1 — slots on dates that already have a booking within MAX_DISTANCE_KM (chronological within zone)
  async function collectZoneSlots(limit: number, skipDate?: string): Promise<string[]> {
    const results: string[] = [];
    for (const d of futureDates) {
      if (!zoneDates.has(d) || d === skipDate) continue;
      const slots = await loadAvailability(d);
      for (const slot of slots.slice(0, 2)) {
        results.push(fmtSlot(d, slot.start_time));
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
    return results;
  }

  // PASS 2 — earliest available slots regardless of zone (plain chronological)
  async function collectAnySlots(limit: number, skipDate?: string): Promise<string[]> {
    const results: string[] = [];
    for (const d of futureDates) {
      if (d === skipDate) continue;
      const slots = await loadAvailability(d);
      for (const slot of slots.slice(0, 2)) {
        results.push(fmtSlot(d, slot.start_time));
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
    return results;
  }

  if (requestedDate) {
    const available = await loadAvailability(requestedDate);

    if (available.length > 0) {
      const inZone = zoneDates.has(requestedDate);
      const slotsText = available
        .slice(0, 2)
        .map((slot) => fmtSlot(requestedDate, slot.start_time))
        .join(", ");

      const msg = inZone
        ? `Ho già altri appuntamenti in zona il ${formatDateForVoice(requestedDate)}. Posso proporle: ${slotsText}.`
        : `Disponibilità il ${formatDateForVoice(requestedDate)}: ${slotsText}.`;

      return createToolResponse(msg, toolCallId);
    }

    // No slots on requested date — try zone first, then any
    const zoneSlots = await collectZoneSlots(4, requestedDate);
    if (zoneSlots.length > 0) {
      return createToolResponse(
        `Non ho disponibilità il ${formatDateForVoice(requestedDate)}, ma ho altri appuntamenti in zona in questi giorni: ${zoneSlots.join(", ")}.`,
        toolCallId
      );
    }

    const anySlots = await collectAnySlots(4, requestedDate);
    if (anySlots.length === 0) {
      return createToolResponse("Non ho trovato disponibilità nei prossimi giorni.", toolCallId);
    }
    return createToolResponse(
      `Non ho disponibilità il ${formatDateForVoice(requestedDate)}. Il prima possibile: ${anySlots.join(", ")}.`,
      toolCallId
    );
  }

  // No date requested — PASS 1: zone slots
  const zoneSlots = await collectZoneSlots(4);
  if (zoneSlots.length > 0) {
    return createToolResponse(
      `Ho disponibilità in giorni con appuntamenti già in zona: ${zoneSlots.join(", ")}.`,
      toolCallId
    );
  }

  // PASS 2: earliest slots
  const anySlots = await collectAnySlots(4);
  if (anySlots.length === 0) {
    return createToolResponse(
      "Non ho trovato disponibilità nei prossimi giorni successivi a oggi.",
      toolCallId
    );
  }
  return createToolResponse(`Prime disponibilità: ${anySlots.join(", ")}.`, toolCallId);
}
