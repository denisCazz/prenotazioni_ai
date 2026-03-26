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
import { checkRoutingConstraint } from "@/lib/utils/routing";
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

  // Geocode the service address once (used for routing checks below)
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

  async function loadAvailability(targetDate: string) {
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

    // Apply routing filter if we have geocoordinates
    if (!coords) return allSlots;

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

  if (requestedDate) {
    const available = await loadAvailability(requestedDate);

    if (available.length === 0) {
      return createToolResponse(`Non ci sono slot disponibili per ${formatDateForVoice(requestedDate)}.`, toolCallId);
    }

    const slotsText = available
      .slice(0, 4)
      .map((slot) => `${formatDateForVoice(requestedDate)} alle ${slot.start_time}`)
      .join(", ");

    return createToolResponse(`Slot disponibili: ${slotsText}.`, toolCallId);
  }

  const suggestions: string[] = [];

  for (const futureDate of getFutureDateCandidates(daysAhead)) {
    const available = await loadAvailability(futureDate);

    for (const slot of available.slice(0, 2)) {
      suggestions.push(`${formatDateForVoice(futureDate)} alle ${slot.start_time}`);
      if (suggestions.length === 4) {
        break;
      }
    }

    if (suggestions.length === 4) {
      break;
    }
  }

  if (suggestions.length === 0) {
    return createToolResponse("Non ho trovato disponibilità nei prossimi giorni successivi a oggi.", toolCallId);
  }

  return createToolResponse(`Prime disponibilità trovate: ${suggestions.join(", ")}.`, toolCallId);
}
