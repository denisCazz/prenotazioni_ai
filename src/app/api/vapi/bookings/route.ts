import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/types/database";
import { createToolResponse, getToolCallId } from "@/lib/vapi/responses";
import { NextResponse } from "next/server";

type BookingCancellationResult = Pick<Tables<"bookings">, "id" | "customer_name" | "date" | "start_time">;

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = createAdminClient();
  const toolCallId = getToolCallId(body);

  const toolName = body.message?.functionCall?.name;

  const params = body.message?.functionCall?.parameters || body;
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

  if (toolName === "cancel_booking") {
    if (!customer_phone || !date) {
      return createToolResponse("Errore: numero di telefono e data sono obbligatori per cancellare una prenotazione.", toolCallId, 400);
    }

    let businessId = business_id;
    if (!businessId && body.message?.call?.assistantId) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("vapi_assistant_id", body.message.call.assistantId)
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
      .eq("customer_phone", customer_phone)
      .eq("date", date)
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

  if (!customer_name || !customer_phone || !date || !start_time) {
    return createToolResponse("Errore: campi obbligatori mancanti per creare la prenotazione.", toolCallId, 400);
  }

  let businessId = business_id;
  if (!businessId && body.message?.call?.assistantId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("vapi_assistant_id", body.message.call.assistantId)
      .single();
    businessId = biz?.id;
  }

  if (!businessId) {
    return createToolResponse("Errore: business non trovato.", toolCallId, 404);
  }

  const duration = 30;
  const [h, m] = start_time.split(":").map(Number);
  const computedEnd = new Date(2000, 0, 1, h, m + duration);
  const computedEndTime = `${String(computedEnd.getHours()).padStart(2, "0")}:${String(computedEnd.getMinutes()).padStart(2, "0")}:00`;
  const startTimeDb = start_time.length === 5 ? `${start_time}:00` : start_time;
  const endTimeDb = end_time ? (end_time.length === 5 ? `${end_time}:00` : end_time) : computedEndTime;

  const { data: bookingData, error } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      service_id: service_id || null,
      customer_name,
      customer_phone,
      date,
      start_time: startTimeDb,
      end_time: endTimeDb,
      status: "confirmed",
      source,
      call_id: call_id || null,
      notes: notes || null,
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
