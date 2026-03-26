import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { createToolResponse, getToolCallId } from "@/lib/vapi/responses";

type BookingLookupResult = Tables<"bookings"> & {
  services: { name: string } | null;
};

export async function POST(request: Request) {
  const body = await request.json();
  const toolCallId = getToolCallId(body);
  const params = body.message?.functionCall?.parameters || body;
  const { customer_phone } = params;

  if (!customer_phone) {
    return createToolResponse("Errore: telefono obbligatorio.", toolCallId, 400);
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .eq("customer_phone", customer_phone)
    .eq("status", "confirmed")
    .gte("date", today)
    .order("date")
    .order("start_time");

  if (error) {
    return createToolResponse(`Errore: ${error.message}`, toolCallId, 500);
  }

  if (!data || data.length === 0) {
    return createToolResponse("Non ho trovato prenotazioni future per questo numero di telefono.", toolCallId);
  }

  const bookings = data as BookingLookupResult[];

  const bookingsText = bookings
    .map((booking) => {
      const serviceName = booking.services?.name;
      return `${booking.date} alle ${booking.start_time.slice(0, 5)}${serviceName ? ` (${serviceName})` : ""}`;
    })
    .join(", ");

  return createToolResponse(`Prenotazioni trovate: ${bookingsText}.`, toolCallId);
}
