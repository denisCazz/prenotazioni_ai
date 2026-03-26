import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { createToolResponse, getToolCallId } from "@/lib/vapi/responses";
import { getAvailableSlots } from "@/lib/utils/availability";

export async function POST(request: Request) {
  const body = await request.json();
  const toolCallId = getToolCallId(body);
  const { message } = body;
  const params = message?.functionCall?.parameters || body;
  const { date, business_id } = params;

  if (!date) {
    return createToolResponse("Errore: data obbligatoria.", toolCallId, 400);
  }

  const supabase = createAdminClient();

  let businessId = business_id;
  if (!businessId && message?.call?.assistantId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", message.call.assistantId)
      .single();
    businessId = biz?.id;
  }

  if (!businessId) {
    return createToolResponse("Errore: business non trovato.", toolCallId, 404);
  }

  const [slotsRes, exceptionsRes, bookingsRes] = await Promise.all([
    supabase.from("availability_slots").select("*").eq("business_id", businessId),
    supabase.from("availability_exceptions").select("*").eq("business_id", businessId).eq("date", date),
    supabase.from("bookings").select("start_time, end_time, status").eq("business_id", businessId).eq("date", date).neq("status", "cancelled"),
  ]);

  const available = getAvailableSlots(
    date,
    (slotsRes.data ?? []) as Tables<"availability_slots">[],
    (exceptionsRes.data ?? []) as Tables<"availability_exceptions">[],
    (bookingsRes.data ?? []) as Pick<Tables<"bookings">, "start_time" | "end_time" | "status">[]
  );

  if (available.length === 0) {
    return createToolResponse(`Non ci sono slot disponibili per il ${date}.`, toolCallId);
  }

  const slotsText = available.map((slot) => `${slot.start_time}-${slot.end_time}`).join(", ");
  return createToolResponse(`Slot disponibili per il ${date}: ${slotsText}.`, toolCallId);
}
