import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { getTodayDateInRome } from "@/lib/utils/availability";
import { createToolResponse, getToolContext } from "@/lib/vapi/responses";

type BookingLookupResult = Tables<"bookings"> & {
  services: { name: string } | null;
};

export async function POST(request: Request) {
  const body = await request.json();
  const { toolCallId, parameters: params } = getToolContext(body);
  const { customer_phone } = params;
  const customerPhone = typeof customer_phone === "string" ? customer_phone : undefined;

  if (!customerPhone) {
    return createToolResponse("Errore: telefono obbligatorio.", toolCallId, 400);
  }

  const supabase = createAdminClient();
  const today = getTodayDateInRome();

  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .eq("customer_phone", customerPhone)
    .eq("status", "confirmed")
    .gt("date", today)
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
