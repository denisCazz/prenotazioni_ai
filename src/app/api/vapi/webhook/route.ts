import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { createToolResponse, getToolCallId } from "@/lib/vapi/responses";

type BookingWithServiceName = Tables<"bookings"> & {
  services: { name: string } | null;
};

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = createAdminClient();
  const toolCallId = getToolCallId(body);

  const { message } = body;

  if (!message) {
    return createToolResponse("Errore: messaggio mancante.", toolCallId, 400);
  }

  const messageType = message.type;

  switch (messageType) {
    case "function-call": {
      const { functionCall } = message;
      if (!functionCall) break;

      const toolName = functionCall.name;
      const toolParams = functionCall.parameters;

      const phoneNumber = message.call?.customer?.number;
      const assistantId = message.call?.assistantId;

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("vapi_assistant_id", assistantId)
        .single();

      if (!business) {
        return createToolResponse("Errore: attività non trovata.", functionCall.id, 404);
      }

      const businessId = business.id;

      switch (toolName) {
        case "check_availability": {
          const { date, service_name } = toolParams;
          let service: Tables<"services"> | null = null;
          if (service_name) {
            const { data } = await supabase
              .from("services")
              .select("*")
              .eq("business_id", businessId)
              .ilike("name", `%${service_name}%`)
              .eq("active", true)
              .limit(1)
              .single();
            service = data as Tables<"services"> | null;
          }

          const { data: slots } = await supabase
            .from("availability_slots")
            .select("*")
            .eq("business_id", businessId);

          const { data: exceptions } = await supabase
            .from("availability_exceptions")
            .select("*")
            .eq("business_id", businessId)
            .eq("date", date);

          const { data: bookings } = await supabase
            .from("bookings")
            .select("start_time, end_time, status")
            .eq("business_id", businessId)
            .eq("date", date)
            .neq("status", "cancelled");

          const { getAvailableSlots } = await import("@/lib/utils/availability");
          const available = getAvailableSlots(
            date,
            (slots ?? []) as Tables<"availability_slots">[],
            (exceptions ?? []) as Tables<"availability_exceptions">[],
            (bookings ?? []) as Pick<Tables<"bookings">, "start_time" | "end_time" | "status">[],
            service ? { duration_minutes: service.duration_minutes, max_concurrent: service.max_concurrent } : undefined
          );

          if (available.length === 0) {
            return createToolResponse(`Non ci sono slot disponibili per il ${date}.`, functionCall.id);
          }

          const slotsText = available.map((s) => `${s.start_time}-${s.end_time}`).join(", ");
          return createToolResponse(`Slot disponibili per il ${date}: ${slotsText}.`, functionCall.id);
        }

        case "create_booking": {
          const { customer_name, customer_phone, date, start_time, service_name, notes } = toolParams;
          const phone = customer_phone || phoneNumber;

          let serviceData: Tables<"services"> | null = null;
          if (service_name) {
            const { data } = await supabase
              .from("services")
              .select("*")
              .eq("business_id", businessId)
              .ilike("name", `%${service_name}%`)
              .eq("active", true)
              .limit(1)
              .single();
            serviceData = data as Tables<"services"> | null;
          }

          const duration = serviceData?.duration_minutes ?? 30;
          const [hours, minutes] = start_time.split(":").map(Number);
          const endDate = new Date(2000, 0, 1, hours, minutes + duration);
          const end_time = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

          const startTimeDb = `${start_time}:00`;
          const endTimeDb = `${end_time}:00`;

          const { data: existingBookings } = await supabase
            .from("bookings")
            .select("start_time, end_time, status")
            .eq("business_id", businessId)
            .eq("date", date)
            .neq("status", "cancelled");

          const { isSlotAvailable } = await import("@/lib/utils/availability");
          if (
            !isSlotAvailable(
              startTimeDb,
              endTimeDb,
              (existingBookings ?? []) as Pick<Tables<"bookings">, "start_time" | "end_time" | "status">[],
              serviceData?.max_concurrent ?? 1
            )
          ) {
            return createToolResponse("Mi dispiace, questo slot non è più disponibile. Vuole provare un altro orario?", functionCall.id);
          }

          const { data: booking, error } = await supabase.from("bookings").insert({
            business_id: businessId,
            service_id: serviceData?.id || null,
            customer_name,
            customer_phone: phone,
            date,
            start_time: startTimeDb,
            end_time: endTimeDb,
            status: "confirmed",
            source: "phone_ai",
            call_id: message.call?.id || null,
            notes: notes || null,
          }).select("id, customer_name, date, start_time").single();

          if (error) {
            return createToolResponse("Si è verificato un errore nella creazione della prenotazione. Riprovi più tardi.", functionCall.id, 500);
          }

          await supabase
            .from("call_logs")
            .upsert(
              {
                business_id: businessId,
                vapi_call_id: message.call?.id || functionCall.id,
                booking_id: booking?.id || null,
                caller_phone: phone || null,
                started_at: message.call?.startedAt || new Date().toISOString(),
                outcome: "booking_created",
              },
              { onConflict: "vapi_call_id" }
            );

          return createToolResponse(
            `Prenotazione confermata per ${customer_name} il ${date} alle ${start_time}${serviceData ? ` per ${serviceData.name}` : ""}. Durata ${duration} minuti.`,
            functionCall.id
          );
        }

        case "cancel_booking": {
          const { customer_phone, date } = toolParams;
          const phone = customer_phone || phoneNumber;

          const { data: bookingRaw } = await supabase
            .from("bookings")
            .select("*")
            .eq("business_id", businessId)
            .eq("customer_phone", phone)
            .eq("date", date)
            .eq("status", "confirmed")
            .order("start_time")
            .limit(1)
            .single();

          const booking = bookingRaw as Tables<"bookings"> | null;

          if (!booking) {
            return createToolResponse("Non ho trovato prenotazioni attive per questo numero e data.", functionCall.id, 404);
          }

          await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", booking.id);

          await supabase
            .from("call_logs")
            .upsert(
              {
                business_id: businessId,
                vapi_call_id: message.call?.id || functionCall.id,
                caller_phone: phone || null,
                started_at: message.call?.startedAt || new Date().toISOString(),
                outcome: "booking_cancelled",
              },
              { onConflict: "vapi_call_id" }
            );

          return createToolResponse(
            `La prenotazione di ${booking.customer_name} per il ${booking.date} alle ${booking.start_time.slice(0, 5)} è stata cancellata.`,
            functionCall.id
          );
        }

        case "lookup_booking": {
          const { customer_phone } = toolParams;
          const phone = customer_phone || phoneNumber;

          const { data: bookingsRaw } = await supabase
            .from("bookings")
            .select("*, services(name)")
            .eq("business_id", businessId)
            .eq("customer_phone", phone)
            .eq("status", "confirmed")
            .gte("date", new Date().toISOString().split("T")[0])
            .order("date")
            .order("start_time");

          const bookings = (bookingsRaw ?? []) as BookingWithServiceName[];

          if (bookings.length === 0) {
            return createToolResponse("Non ho trovato prenotazioni future per questo numero di telefono.", functionCall.id);
          }

          const list = bookings.map((b) => {
            const serviceName = b.services?.name ?? "";
            return `- ${b.date} alle ${b.start_time.slice(0, 5)}${serviceName ? ` (${serviceName})` : ""}`;
          }).join("\n");

          return createToolResponse(`Prenotazioni trovate per ${phone}: ${list}.`, functionCall.id);
        }

        case "get_business_info": {
          const { data: bizRaw } = await supabase
            .from("businesses")
            .select("*")
            .eq("id", businessId)
            .single();

          const biz = bizRaw as Tables<"businesses"> | null;

          const { data: services } = await supabase
            .from("services")
            .select("name, duration_minutes, description")
            .eq("business_id", businessId)
            .eq("active", true);

          const { data: slots } = await supabase
            .from("availability_slots")
            .select("day_of_week, start_time, end_time")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("day_of_week");

          const { getWeekDayName } = await import("@/lib/utils/availability");
          const schedule = (slots || []).map(
            (s) => `${getWeekDayName(s.day_of_week)}: ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`
          ).join(", ");

          const serviceList = (services || []).map(
            (s) => `${s.name} (${s.duration_minutes} min)${s.description ? `: ${s.description}` : ""}`
          ).join(", ");

          return createToolResponse(
            `${biz?.name || "Attività"} - ${biz?.type || ""}. Indirizzo: ${biz?.address || "Non specificato"}. Orari: ${schedule || "Non configurati"}. Servizi: ${serviceList || "Non configurati"}.`,
            functionCall.id
          );
        }
      }
      break;
    }

    case "end-of-call-report": {
      const callId = message.call?.id;
      const assistantId = message.call?.assistantId;

      if (callId && assistantId) {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("vapi_assistant_id", assistantId)
          .single();

        if (business) {
          await supabase.from("call_logs").upsert({
            business_id: business.id,
            vapi_call_id: callId,
            caller_phone: message.call?.customer?.number || null,
            started_at: message.call?.startedAt || new Date().toISOString(),
            ended_at: message.call?.endedAt || new Date().toISOString(),
            duration_seconds: message.call?.duration ? Math.round(message.call.duration) : null,
            transcript: message.transcript || null,
            summary: message.summary || null,
            outcome: message.call?.endedReason === "customer-ended-call" ? "info_request" : null,
            recording_url: message.recordingUrl || null,
            cost: message.cost || null,
          }, { onConflict: "vapi_call_id" });
        }
      }
      break;
    }
  }

  return createToolResponse("OK", toolCallId);
}
