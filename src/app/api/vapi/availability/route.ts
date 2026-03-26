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

  // Helper: collect up to `limit` slot suggestions from an ordered list of dates,
  // skipping `skipDate`. Returns array of formatted strings and whether any were from zone.
  async function collectSuggestions(
    dates: string[],
    limit: number,
    skipDate?: string
  ): Promise<{ suggestions: string[]; hasZone: boolean }> {
    const suggestions: string[] = [];
    let hasZone = false;
    for (const d of dates) {
      if (d === skipDate) continue;
      const slots = await loadAvailability(d);
      for (const slot of slots.slice(0, 2)) {
        if (zoneDates.has(d)) hasZone = true;
        suggestions.push(fmtSlot(d, slot.start_time));
        if (suggestions.length >= limit) break;
      }
      if (suggestions.length >= limit) break;
    }
    return { suggestions, hasZone };
  }

  const futureDates = Array.from(getFutureDateCandidates(Math.max(daysAhead, 14)));

  // Zone dates first, then others — this is the core of the zone-preference logic
  const orderedDates = [
    ...futureDates.filter((d) => zoneDates.has(d)),
    ...futureDates.filter((d) => !zoneDates.has(d)),
  ];

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

    // No slots on requested date — find alternatives, preferring zone dates
    const { suggestions, hasZone } = await collectSuggestions(orderedDates, 4, requestedDate);

    if (suggestions.length === 0) {
      return createToolResponse(
        "Non ho trovato disponibilità nei prossimi giorni.",
        toolCallId
      );
    }

    const fallbackIntro = hasZone
      ? `Non ho disponibilità il ${formatDateForVoice(requestedDate)}, ma ho trovato slot in giorni con appuntamenti già in zona`
      : `Non ho disponibilità il ${formatDateForVoice(requestedDate)}. Le prime alternative sono`;

    return createToolResponse(`${fallbackIntro}: ${suggestions.join(", ")}.`, toolCallId);
  }

  // No date requested — find next available slots, zone dates first
  const { suggestions, hasZone } = await collectSuggestions(orderedDates, 4);

  if (suggestions.length === 0) {
    return createToolResponse(
      "Non ho trovato disponibilità nei prossimi giorni successivi a oggi.",
      toolCallId
    );
  }

  const intro = hasZone
    ? "Ho trovato disponibilità in giorni con appuntamenti già in zona"
    : "Prime disponibilità trovate";

  return createToolResponse(`${intro}: ${suggestions.join(", ")}.`, toolCallId);
}
