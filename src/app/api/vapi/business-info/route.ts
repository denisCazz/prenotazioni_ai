import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { createToolResponse, getToolContext } from "@/lib/vapi/responses";

type BusinessInfoService = Pick<Tables<"services">, "name" | "duration_minutes">;
type BusinessInfoAvailability = Pick<Tables<"availability_slots">, "day_of_week" | "start_time" | "end_time">;

export async function POST(request: Request) {
  const body = await request.json();
  const { toolCallId, assistantId } = getToolContext(body);

  if (!assistantId) {
    return createToolResponse("Errore: assistant ID mancante.", toolCallId, 400);
  }

  const supabase = createAdminClient();

  const { data: businessRaw } = await supabase
    .from("businesses")
    .select("*")
    .eq("vapi_assistant_id", assistantId)
    .single();

  const business = businessRaw as Tables<"businesses"> | null;

  if (!business) {
    return createToolResponse("Errore: business non trovato.", toolCallId, 404);
  }

  const [servicesRes, slotsRes] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", business.id).eq("active", true),
    supabase.from("availability_slots").select("*").eq("business_id", business.id).eq("is_active", true).order("day_of_week"),
  ]);

  const services = (servicesRes.data || []) as BusinessInfoService[];
  const availabilitySlots = (slotsRes.data || []) as BusinessInfoAvailability[];

  const servicesText = services
    .map((service) => `${service.name} (${service.duration_minutes} min)`)
    .join(", ");
  const availabilityText = availabilitySlots
    .map((slot) => `${slot.day_of_week}: ${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`)
    .join(", ");

  return createToolResponse(
    `${business.name} - ${business.type}. Indirizzo: ${business.address || "Non specificato"}. Servizi: ${servicesText || "Non configurati"}. Disponibilita: ${availabilityText || "Non configurata"}.`,
    toolCallId
  );
}
