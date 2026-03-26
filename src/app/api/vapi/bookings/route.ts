import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { isOnOrBeforeTodayInRome } from "@/lib/utils/availability";
import { createToolResponse, getToolContext } from "@/lib/vapi/responses";
import { NextResponse } from "next/server";

type BookingCancellationResult = Pick<Tables<"bookings">, "id" | "customer_name" | "date" | "start_time">;

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = createAdminClient();
  const { toolCallId, toolName, parameters: params, assistantId, callerPhone, callerName } = getToolContext(body);
  const {
    business_id,
    customer_name,
    customer_phone,
    date,
    start_time,
    end_time,
    service_id,
    notes,
    source = "manual",
    call_id,
  } = params;
  const businessIdFromParams = typeof business_id === "string" ? business_id : undefined;
  const customerName = typeof customer_name === "string" ? customer_name : callerName;
  const customerPhone = typeof customer_phone === "string" ? customer_phone : callerPhone;
  const bookingDate = typeof date === "string" ? date : undefined;
  const startTime = typeof start_time === "string" ? start_time : undefined;
  const endTime = typeof end_time === "string" ? end_time : undefined;
  const serviceId = typeof service_id === "string" ? service_id : undefined;
  const bookingNotes = typeof notes === "string" ? notes : undefined;
  const bookingSource = typeof source === "string" ? source : "manual";
  const callId = typeof call_id === "string" ? call_id : undefined;
  const cancelPhone = customerPhone;
  const cancelDate = bookingDate;

  if (toolName === "cancel_booking") {
    if (!cancelPhone || !cancelDate) {
      return createToolResponse("Errore: numero di telefono e data sono obbligatori per cancellare una prenotazione.", toolCallId, 400);
    }

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

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("id, customer_name, date, start_time")
      .eq("business_id", businessId)
      .eq("customer_phone", cancelPhone)
      .eq("date", cancelDate)
      .eq("status", "confirmed")
      .order("start_time")
      .limit(1)
      .single();

    const booking = bookingData as BookingCancellationResult | null;

    if (!booking) {
      return createToolResponse("Non ho trovato prenotazioni attive per questo numero e data.", toolCallId, 404);
    }

    const { error: cancelError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);

    if (cancelError) {
      return createToolResponse("Errore: impossibile cancellare la prenotazione in questo momento.", toolCallId, 500);
    }

    return createToolResponse(
      `Prenotazione cancellata per ${booking.customer_name} il ${booking.date} alle ${booking.start_time.slice(0, 5)}.`,
      toolCallId
    );
  }

  const missingFields: string[] = [];

  if (!customerName) missingFields.push("nome e cognome");
  if (!customerPhone) missingFields.push("numero di telefono");
  if (!bookingDate) missingFields.push("data");
  if (!startTime) missingFields.push("orario");

  if (missingFields.length > 0) {
    return createToolResponse(
      `Per confermare la prenotazione mi servono ancora questi dati: ${missingFields.join(", ")}.`,
      toolCallId,
      400
    );
  }

  const resolvedCustomerName = customerName as string;
  const resolvedCustomerPhone = customerPhone as string;
  const resolvedBookingDate = bookingDate as string;
  const resolvedStartTime = startTime as string;

  if (isOnOrBeforeTodayInRome(resolvedBookingDate)) {
    return createToolResponse("Posso fissare solo appuntamenti in date successive a oggi.", toolCallId, 400);
  }

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

  const resolvedBusinessId = businessId as string;

  const duration = 30;
  const [h, m] = resolvedStartTime.split(":").map(Number);
  const computedEnd = new Date(2000, 0, 1, h, m + duration);
  const computedEndTime = `${String(computedEnd.getHours()).padStart(2, "0")}:${String(computedEnd.getMinutes()).padStart(2, "0")}:00`;
  const startTimeDb = resolvedStartTime.length === 5 ? `${resolvedStartTime}:00` : resolvedStartTime;
  const endTimeDb = endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : computedEndTime;

  const { data: bookingData, error } = await supabase
    .from("bookings")
    .insert({
      business_id: resolvedBusinessId,
      service_id: serviceId || null,
      customer_name: resolvedCustomerName,
      customer_phone: resolvedCustomerPhone,
      date: resolvedBookingDate,
      start_time: startTimeDb,
      end_time: endTimeDb,
      status: "confirmed",
      source: bookingSource,
      call_id: callId || null,
      notes: bookingNotes || null,
    })
    .select()
    .single();

  const booking = bookingData as Tables<"bookings"> | null;

  if (error) {
    return createToolResponse(`Errore: ${error.message}`, toolCallId, 500);
  }

  if (!booking) {
    return createToolResponse("Errore: prenotazione non restituita dal database.", toolCallId, 500);
  }

  return createToolResponse(
    `Prenotazione confermata per ${booking.customer_name} il ${booking.date} alle ${booking.start_time.slice(0, 5)}.`,
    toolCallId,
    201
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID obbligatorio" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
