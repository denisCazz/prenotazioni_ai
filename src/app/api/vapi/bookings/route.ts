import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = createAdminClient();

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

  if (!customer_name || !customer_phone || !date || !start_time) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
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
    return NextResponse.json({ error: "Business non trovato" }, { status: 404 });
  }

  const duration = 30;
  const [h, m] = start_time.split(":").map(Number);
  const computedEnd = new Date(2000, 0, 1, h, m + duration);
  const computedEndTime = `${String(computedEnd.getHours()).padStart(2, "0")}:${String(computedEnd.getMinutes()).padStart(2, "0")}:00`;
  const startTimeDb = start_time.length === 5 ? `${start_time}:00` : start_time;
  const endTimeDb = end_time ? (end_time.length === 5 ? `${end_time}:00` : end_time) : computedEndTime;

  const { data, error } = await supabase
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
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
